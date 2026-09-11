// Community corrections: "this place closed", "safety info is wrong", or a new
// spot to add. Anyone can file one (auth optional — low friction on purpose);
// only an admin can read or triage them, enforced by the `admins/{uid}`
// allowlist in firestore.rules rather than by hiding the collection.

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

const REPORTS = collection(db, 'reports');

export const CHANGE_TYPES = [
  { value: 'closed', label: 'Permanently closed' },
  { value: 'moved', label: 'Moved / wrong address' },
  { value: 'safety', label: 'Safety info is wrong' },
  { value: 'hours', label: 'Hours are wrong' },
  { value: 'other', label: 'Something else' },
];

export async function submitReport({
  type,
  restaurantId = null,
  restaurantName = '',
  text = '',
}) {
  await addDoc(REPORTS, {
    type,
    restaurantId,
    restaurantName: restaurantName.slice(0, 200),
    text: text.trim().slice(0, 2000),
    uid: auth.currentUser?.uid ?? null,
    handle: (() => {
      try {
        return localStorage.getItem('zgg.handle') || null;
      } catch {
        return null;
      }
    })(),
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

// ---- admin triage ----

// Is this account on the `admins` allowlist? The rules let a signed-in user
// read only their own admins/{uid} doc, so a non-admin gets a clean
// "doesn't exist" rather than a permission error.
export async function isAdminUser(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

function shapeReport(d) {
  const v = d.data();
  const created = v.createdAt?.toDate?.() ?? null;
  return {
    id: d.id,
    type: v.type || 'other',
    restaurantId: v.restaurantId || null,
    restaurantName: v.restaurantName || '',
    text: v.text || '',
    uid: v.uid || null,
    handle: v.handle || null,
    status: v.status || 'open',
    date: (created ?? new Date()).toISOString(),
    pending: !created,
  };
}

// Live queue of every report, newest first. Admin-only — a non-admin's
// listener fails on the rules, which is what the UI gate expects.
export function watchReports(onData, onError) {
  const q = query(
    collection(db, 'reports'),
    orderBy('createdAt', 'desc'),
    limit(500)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(shapeReport)),
    (err) => onError?.(err)
  );
}

export function setReportStatus(id, status) {
  return updateDoc(doc(db, 'reports', id), {
    status,
    triagedAt: serverTimestamp(),
    triagedBy: auth.currentUser?.uid ?? null,
  });
}

// A safety report is the one kind we never want sitting in the queue — it
// means someone may be getting sick on information we published.
export const isUrgent = (r) => r.type === 'safety' && r.status === 'open';

// Corroboration: N independent people filing the same report type about the
// same spot. Done client-side over the open queue — no Cloud Function, no
// server aggregate. Returns { [`${restaurantId}|${type}`]: count }.
export function corroboration(reports) {
  const counts = {};
  for (const r of reports) {
    if (r.status !== 'open' || !r.restaurantId) continue;
    const key = `${r.restaurantId}|${r.type}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
