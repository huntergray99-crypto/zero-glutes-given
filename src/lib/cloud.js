// Firestore data layer for the shared social layer: posts feed + public user
// cards (leaderboard). Auth is Google or anonymous. Photos are NOT here yet —
// they stay in IndexedDB (see photos.js) until Firebase Storage is turned on;
// a cloud post keeps a device-local `photoId` that only resolves for its author.

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { parseHashtags } from './posts';

const POSTS = collection(db, 'posts');
const USERS = collection(db, 'users');

// ---- auth ----

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signInAsGuest() {
  return signInAnonymously(auth);
}

export function signOutCloud() {
  return fbSignOut(auth);
}

export function defaultHandle(user) {
  if (!user) return 'anon';
  if (user.displayName) {
    return user.displayName.split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'eater';
  }
  return `eater-${user.uid.slice(0, 4)}`;
}

// ---- posts ----

// Live feed of every post, newest first. Returns an unsubscribe fn.
export function watchPosts(onData, onError) {
  const q = query(POSTS, orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(shapePost)),
    (err) => onError?.(err)
  );
}

function shapePost(d) {
  const v = d.data();
  const created = v.createdAt?.toDate?.() ?? null;
  return {
    id: d.id,
    uid: v.uid,
    handle: v.handle || 'anon',
    restaurantId: v.restaurantId,
    text: v.text || '',
    tags: v.tags || [],
    photoId: v.photoId || null,
    date: (created ?? new Date()).toISOString(),
    pending: !created, // serverTimestamp not settled yet
    cloud: true,
  };
}

export async function addCloudPost({ restaurantId, text, photoId = null }) {
  const user = auth.currentUser;
  if (!user) throw new Error('not signed in');
  const trimmed = (text || '').trim();
  const ref = await addDoc(POSTS, {
    uid: user.uid,
    handle: currentHandle(),
    restaurantId,
    text: trimmed,
    tags: parseHashtags(trimmed),
    photoId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function deleteCloudPost(id) {
  return deleteDoc(doc(db, 'posts', id));
}

// ---- user card (public profile + leaderboard) ----

// The handle is mirrored to localStorage so the composer can stamp posts
// synchronously without a Firestore read.
const HANDLE_KEY = 'zgg.handle';

export function currentHandle() {
  try {
    return localStorage.getItem(HANDLE_KEY) || defaultHandle(auth.currentUser);
  } catch {
    return defaultHandle(auth.currentUser);
  }
}

export function setLocalHandle(handle) {
  try {
    localStorage.setItem(HANDLE_KEY, handle);
  } catch {
    /* ignore */
  }
}

// Push the local point/stat totals to the user's public card so the leaderboard
// reflects this device. Called after check-ins, reviews, posts.
export async function syncUserCard(stats) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(
    doc(db, 'users', user.uid),
    {
      handle: currentHandle(),
      photoURL: user.photoURL || null,
      anonymous: user.isAnonymous,
      points: stats.points ?? 0,
      level: stats.level?.name ?? 'Crumb',
      checkIns: stats.totalCheckIns ?? 0,
      spots: stats.uniqueSpots ?? 0,
      reviews: stats.reviewsWritten ?? 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function watchLeaderboard(onData, onError) {
  const q = query(USERS, orderBy('points', 'desc'), limit(25));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((u) => u.points > 0)
      ),
    (err) => onError?.(err)
  );
}

// ---- one-time migration: local posts -> cloud ----

const MIGRATED_KEY = 'zgg.migrated.v1';

export function hasMigrated() {
  try {
    return localStorage.getItem(MIGRATED_KEY) === '1';
  } catch {
    return false;
  }
}

function markMigrated() {
  try {
    localStorage.setItem(MIGRATED_KEY, '1');
  } catch {
    /* ignore */
  }
}

// Copy any device-local posts into the cloud under the current account, skipping
// ones already there (matched by text + restaurant + rough time).
export async function migrateLocalPosts(localPosts) {
  const user = auth.currentUser;
  if (!user || !localPosts?.length) {
    markMigrated();
    return 0;
  }
  const mine = await getDocs(query(POSTS, where('uid', '==', user.uid)));
  const seen = new Set(
    mine.docs.map((d) => {
      const v = d.data();
      return `${v.restaurantId}|${(v.text || '').trim()}`;
    })
  );
  let moved = 0;
  for (const p of localPosts) {
    const key = `${p.restaurantId}|${(p.text || '').trim()}`;
    if (seen.has(key)) continue;
    await addDoc(POSTS, {
      uid: user.uid,
      handle: currentHandle(),
      restaurantId: p.restaurantId,
      text: p.text || '',
      tags: p.tags || parseHashtags(p.text || ''),
      photoId: p.photoId || null,
      createdAt: serverTimestamp(),
      migratedAt: serverTimestamp(),
    });
    seen.add(key);
    moved += 1;
  }
  markMigrated();
  return moved;
}
