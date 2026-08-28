// Per-restaurant community notes — a lightweight text thread, separate from the
// structured celiac reviews and the photo/post feed. Cloud (Firestore) when
// signed in, on-device otherwise. No composite index needed: we filter by
// restaurantId and sort client-side.

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { currentHandle } from './cloud';

const COMMENTS = collection(db, 'comments');
const LKEY = 'zgg.comments.v1';

function shape(d) {
  const v = d.data();
  const created = v.createdAt?.toDate?.() ?? null;
  return {
    id: d.id,
    uid: v.uid,
    handle: v.handle || 'anon',
    restaurantId: v.restaurantId,
    text: v.text || '',
    date: (created ?? new Date()).toISOString(),
    pending: !created,
    cloud: true,
  };
}

export function watchComments(restaurantId, onData, onError) {
  const q = query(COMMENTS, where('restaurantId', '==', restaurantId));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map(shape).sort((a, b) => a.date.localeCompare(b.date))
      ),
    (err) => onError?.(err)
  );
}

export async function addCloudComment(restaurantId, text) {
  const user = auth.currentUser;
  if (!user) throw new Error('not signed in');
  const ref = await addDoc(COMMENTS, {
    uid: user.uid,
    handle: currentHandle(),
    restaurantId,
    text: text.trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function deleteCloudComment(id) {
  return deleteDoc(doc(db, 'comments', id));
}

// ---- on-device fallback ----

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LKEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocal(all) {
  try {
    localStorage.setItem(LKEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function localComments(restaurantId) {
  return (readLocal()[restaurantId] || [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function addLocalComment(restaurantId, text) {
  const all = readLocal();
  const list = all[restaurantId] || [];
  list.push({
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    restaurantId,
    text: text.trim().slice(0, 1000),
    handle: (() => {
      try {
        return localStorage.getItem('zgg.handle') || 'anon';
      } catch {
        return 'anon';
      }
    })(),
    date: new Date().toISOString(),
    cloud: false,
  });
  all[restaurantId] = list;
  writeLocal(all);
}

export function deleteLocalComment(restaurantId, id) {
  const all = readLocal();
  all[restaurantId] = (all[restaurantId] || []).filter((c) => c.id !== id);
  writeLocal(all);
}
