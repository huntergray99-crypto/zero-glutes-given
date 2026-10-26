// Delete the signed-in account and everything the cloud holds for it. Both app
// stores require this to be doable from inside the app (Google Play's account-
// deletion policy; Apple guideline 5.1.1(v)), and "email us" doesn't count.
//
// Order matters, and each step is chosen so a failure part-way is safe to
// retry rather than leaving a half-deleted account:
//   1. Re-authenticate FIRST (Google accounts). Firebase refuses to delete an
//      auth user whose sign-in is stale, and finding that out after the data
//      is already gone would strand a signed-in account with nothing in it.
//   2. Purge Firestore while still authenticated — the rules need the uid.
//      Every step is a query on `uid`, so re-running after a failure just
//      picks up whatever is left.
//   3. Delete the users/{uid} card, then the auth user, last.
//
// Not touched, on purpose:
//   - On-device data (localStorage / IndexedDB): the user controls that from
//     their browser or OS settings, as the privacy policy says.
//   - entitlements/{uid}: admin/webhook-write-only, and a purchase record is
//     the one thing that may legitimately need to outlive an account (tax,
//     refunds). The privacy policy says so.

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from './firebase';

// Collections whose documents carry the owner's id in a `uid` field.
export const OWNED_COLLECTIONS = ['posts', 'comments', 'reviews', 'checkIns', 'reports'];

// Firestore caps a batch at 500 writes.
const BATCH = 400;

// While true, nothing may re-create the user's public card. App.jsx re-syncs
// it whenever stats change, and deleting someone's check-ins and posts is
// exactly what changes their stats — without this, the card deleted in step 3
// is resurrected a moment later by the very data purge that preceded it.
let deleting = false;
export const isDeletingAccount = () => deleting;

async function purge(name, uid) {
  const snap = await getDocs(query(collection(db, name), where('uid', '==', uid)));
  for (let i = 0; i < snap.docs.length; i += BATCH) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

// Resolves with { removed: { [collection]: count } }. Rejects with the
// underlying Firebase error (e.g. auth/popup-closed-by-user,
// auth/user-mismatch) so the caller can word it; nothing has been deleted if
// the failure was during re-authentication.
//
// Call it straight from the click handler: reauthenticateWithPopup opens a
// popup, which browsers block unless it follows a user gesture synchronously.
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('not signed in');

  deleting = true;
  try {
    if (!user.isAnonymous) {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    }
    const removed = {};
    for (const name of OWNED_COLLECTIONS) {
      removed[name] = await purge(name, user.uid);
    }
    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
    return { removed };
  } finally {
    deleting = false;
  }
}
