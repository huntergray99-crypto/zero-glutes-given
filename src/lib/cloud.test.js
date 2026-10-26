import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ writes: [], deleting: false }));

vi.mock('./firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'u1', isAnonymous: true, photoURL: null } },
}));
vi.mock('./account', () => ({ isDeletingAccount: () => h.deleting }));
vi.mock('./badges', () => ({ earnedBadges: () => [] }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: (_db, col, id) => ({ path: `${col}/${id}` }),
  setDoc: async (ref, data) => {
    h.writes.push({ path: ref.path, data });
  },
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: () => 'TS',
}));

import { syncUserCard } from './cloud';

beforeEach(() => {
  h.writes = [];
  h.deleting = false;
});

describe('syncUserCard', () => {
  it('writes the public card normally', async () => {
    await syncUserCard({ points: 40, totalCheckIns: 2, verifiedCheckIns: 1, uniqueSpots: 2 });
    expect(h.writes).toHaveLength(1);
    expect(h.writes[0].path).toBe('users/u1');
    expect(h.writes[0].data).toMatchObject({ points: 40, checkIns: 2, verifiedCheckIns: 1 });
  });

  it('does not write while the account is being deleted', async () => {
    // Deleting someone's data changes their stats, and App.jsx re-syncs the
    // card on every stats change. Without this guard the card deleteAccount()
    // removes is recreated moments later by the purge that preceded it.
    h.deleting = true;
    await syncUserCard({ points: 0 });
    expect(h.writes).toEqual([]);
  });
});
