// Check-in visit history — the GPS-verified "I was actually there" signal
// behind punch cards, points, and the leaderboard. Cloud (Firestore) when
// signed in, on-device otherwise. One doc per (user, restaurant) pair, keyed
// so a client never needs a composite index to read its own data back.
//
// Unlike reviews/comments this isn't restaurant-scoped for reads — the
// profile card and punch card need every restaurant a user has checked into
// at once, so callers subscribe by uid, not by restaurantId.

import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const CHECKINS = collection(db, 'checkIns');

const checkinDocId = (uid, restaurantId) => `${uid}_${restaurantId}`;

// Live map of { [restaurantId]: visits[] } for one user. Returns an
// unsubscribe fn.
export function watchCheckIns(uid, onData, onError) {
  const q = query(CHECKINS, where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const v = d.data();
        map[v.restaurantId] = v.visits || [];
      });
      onData(map);
    },
    (err) => onError?.(err)
  );
}

// Full overwrite of one restaurant's visit list — matches the existing
// local read-modify-write pattern, and visit lists stay tiny (one 24h
// cooldown apart) so this is cheap.
export function saveCloudCheckIns(uid, restaurantId, visits) {
  return setDoc(doc(db, 'checkIns', checkinDocId(uid, restaurantId)), {
    uid,
    restaurantId,
    visits,
    updatedAt: serverTimestamp(),
  });
}

// One-time: copy device-local check-ins into the cloud on sign-in, skipping
// any restaurant that already has a cloud doc for this account (don't
// clobber a returning user's cloud history with a stale local copy).
export async function migrateLocalCheckIns(uid, localMap) {
  let moved = 0;
  for (const [restaurantId, visits] of Object.entries(localMap || {})) {
    if (!visits?.length) continue;
    const ref = doc(db, 'checkIns', checkinDocId(uid, restaurantId));
    // eslint-disable-next-line no-await-in-loop -- small, rare, one-time migration
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    // eslint-disable-next-line no-await-in-loop -- small, rare, one-time migration
    await setDoc(ref, {
      uid,
      restaurantId,
      visits,
      updatedAt: serverTimestamp(),
      migratedAt: serverTimestamp(),
    });
    moved += 1;
  }
  return moved;
}
