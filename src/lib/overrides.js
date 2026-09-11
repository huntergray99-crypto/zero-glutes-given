// Runtime corrections to the restaurant data.
//
// The static dataset in data/restaurants.js stays the baseline: it ships in
// the bundle, so first paint is instant and the PWA still works offline. This
// collection holds only what has *changed* since that build — a corrected
// safety level, a spot that closed, a re-verification date — keyed by
// restaurant id and merged over the baseline at runtime.
//
// That split is deliberate. It means a safety correction goes live the moment
// an admin saves it (no rebuild, no deploy), while a cold offline load still
// shows good data. Each doc carries who changed it and when, which is the
// audit trail the safety claims ultimately rest on.

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

const OVERRIDES = collection(db, 'restaurantOverrides');

// Fields an override may set. Anything else in a doc is ignored on merge, so
// a stray console edit can't inject arbitrary shape into the app.
export const OVERRIDABLE = [
  'name',
  'neighborhood',
  'address',
  'lat',
  'lng',
  'cuisine',
  'safetyLevel',
  'dedicatedFryer',
  'celiacVerified',
  'priceLevel',
  'website',
  'phone',
  'summary',
  'whatToOrder',
  'lastVerified',
  'lateNight',
  'lateNote',
  'featured',
  'spotlight',
  'honorableMention',
  'order',
  'closed',
];

// Bookkeeping we attach but never merge into the restaurant record.
const AUDIT = ['updatedAt', 'updatedBy', 'updatedByHandle', 'note'];

export function cleanOverride(data) {
  const out = {};
  for (const k of OVERRIDABLE) {
    if (data[k] !== undefined) out[k] = data[k];
  }
  return out;
}

export function auditOf(data) {
  const out = {};
  for (const k of AUDIT) {
    if (data[k] !== undefined) out[k] = data[k];
  }
  if (out.updatedAt?.toDate) out.updatedAt = out.updatedAt.toDate().toISOString();
  return out;
}

// Live map of { [restaurantId]: overrideData }. Public read — every visitor
// needs corrections applied, that's the point of them.
export function watchOverrides(onData, onError) {
  return onSnapshot(
    OVERRIDES,
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      onData(map);
    },
    (err) => onError?.(err)
  );
}

// Merge fields into a spot's override doc. Admin-only, enforced by the rules.
export function saveOverride(restaurantId, fields, note = '') {
  return setDoc(
    doc(db, 'restaurantOverrides', restaurantId),
    {
      ...cleanOverride(fields),
      note: note.slice(0, 500),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? null,
      updatedByHandle: (() => {
        try {
          return localStorage.getItem('zgg.handle') || null;
        } catch {
          return null;
        }
      })(),
    },
    { merge: true }
  );
}

// Drop an override entirely — the spot reverts to whatever the bundled
// baseline says.
export function clearOverride(restaurantId) {
  return deleteDoc(doc(db, 'restaurantOverrides', restaurantId));
}
