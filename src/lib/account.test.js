import { describe, it, expect, beforeEach, vi } from 'vitest';

// Shared, hoisted so the vi.mock factories below can see it. `calls` is an
// ordered log of every side effect — these tests are about ORDER as much as
// about what gets deleted.
const h = vi.hoisted(() => ({ calls: [], docs: {}, user: null, failOn: null }));

vi.mock('./firebase', () => ({
  db: {},
  auth: {
    get currentUser() {
      return h.user;
    },
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  where: (field, op, value) => ({ field, op, value }),
  query: (col, ...clauses) => ({ col, clauses }),
  getDocs: async (q) => {
    h.calls.push(`query:${q.col.name}:${q.clauses[0].value}`);
    const docs = h.docs[q.col.name] ?? [];
    return { docs, size: docs.length };
  },
  doc: (_db, col, id) => ({ path: `${col}/${id}` }),
  deleteDoc: async (ref) => {
    h.calls.push(`delete:${ref.path}`);
  },
  writeBatch: () => {
    const refs = [];
    return {
      delete: (ref) => refs.push(ref),
      commit: async () => {
        if (h.failOn === 'commit') throw Object.assign(new Error('denied'), { code: 'permission-denied' });
        h.calls.push(`batch:${refs.length}`);
      },
    };
  },
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  reauthenticateWithPopup: async () => {
    if (h.failOn === 'reauth') {
      throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' });
    }
    h.calls.push('reauth');
  },
  deleteUser: async () => {
    h.calls.push('deleteUser');
  },
}));

import { deleteAccount, isDeletingAccount, OWNED_COLLECTIONS } from './account';

const fakeDocs = (collection, n) =>
  Array.from({ length: n }, (_, i) => ({ ref: { path: `${collection}/d${i}` } }));

beforeEach(() => {
  h.calls = [];
  h.docs = {};
  h.failOn = null;
  h.user = { uid: 'u1', isAnonymous: true };
});

describe('deleteAccount', () => {
  it('purges every owned collection, then the card, then the auth user — in that order', async () => {
    h.docs = { posts: fakeDocs('posts', 2), reviews: fakeDocs('reviews', 1) };
    const { removed } = await deleteAccount();

    expect(h.calls).toEqual([
      'query:posts:u1',
      'batch:2',
      'query:comments:u1',
      'query:reviews:u1',
      'batch:1',
      'query:checkIns:u1',
      'query:reports:u1',
      'delete:users/u1',
      'deleteUser',
    ]);
    expect(removed).toEqual({ posts: 2, comments: 0, reviews: 1, checkIns: 0, reports: 0 });
  });

  it('never re-authenticates a guest — there is no Google account to confirm', async () => {
    await deleteAccount();
    expect(h.calls).not.toContain('reauth');
  });

  it('re-authenticates a Google user BEFORE deleting anything', async () => {
    // Firebase refuses to delete an auth user with a stale sign-in. Finding
    // that out after the data is gone would strand an empty, signed-in account.
    h.user = { uid: 'u1', isAnonymous: false };
    h.docs = { posts: fakeDocs('posts', 1) };
    await deleteAccount();
    expect(h.calls[0]).toBe('reauth');
    expect(h.calls.indexOf('reauth')).toBeLessThan(h.calls.indexOf('batch:1'));
  });

  it('deletes nothing at all if the user backs out of re-authentication', async () => {
    h.user = { uid: 'u1', isAnonymous: false };
    h.failOn = 'reauth';
    await expect(deleteAccount()).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' });
    expect(h.calls).toEqual([]);
  });

  it('keeps the auth user if the purge fails, so a retry can finish the job', async () => {
    h.docs = { posts: fakeDocs('posts', 1) };
    h.failOn = 'commit';
    await expect(deleteAccount()).rejects.toMatchObject({ code: 'permission-denied' });
    expect(h.calls).not.toContain('deleteUser');
    expect(h.calls).not.toContain('delete:users/u1');
  });

  it('splits a large collection into batches under Firestore’s 500-write cap', async () => {
    h.docs = { posts: fakeDocs('posts', 900) };
    await deleteAccount();
    expect(h.calls.filter((c) => c.startsWith('batch:'))).toEqual([
      'batch:400',
      'batch:400',
      'batch:100',
    ]);
  });

  it('refuses when nobody is signed in', async () => {
    h.user = null;
    await expect(deleteAccount()).rejects.toThrow('not signed in');
    expect(h.calls).toEqual([]);
  });

  it('flags itself as deleting while running, and clears the flag after — success or failure', async () => {
    const running = deleteAccount();
    expect(isDeletingAccount()).toBe(true);
    await running;
    expect(isDeletingAccount()).toBe(false);

    h.failOn = 'commit';
    h.docs = { posts: fakeDocs('posts', 1) };
    await expect(deleteAccount()).rejects.toThrow();
    expect(isDeletingAccount()).toBe(false);
  });

  it('covers every collection that stores a user’s data', () => {
    expect(OWNED_COLLECTIONS).toEqual(
      expect.arrayContaining(['posts', 'comments', 'reviews', 'checkIns', 'reports'])
    );
  });
});
