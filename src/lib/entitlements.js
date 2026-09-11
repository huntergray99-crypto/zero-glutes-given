// Premium entitlement — deliberately its own collection, not a field on the
// mutable `users/{uid}` doc a signed-in client already writes points/handle
// to. If "premium" lived there, the rules would need to carve out one field
// as un-writable inside an otherwise-open document — easy to get wrong once
// and give away free premium. Here the whole collection is admin/webhook-only
// by construction; a user can only ever read their own doc.
//
// No payment processor is wired up yet (see the AskUserQuestion history in
// this session — that's a business decision, not made yet). This module is
// the seam it plugs into:
//   - Stripe: a webhook handler (Cloud Function, needs Blaze) calls
//     setEntitlement(uid, { premium: true, plan: 'monthly', source: 'stripe' })
//     using the Admin SDK, which bypasses these rules entirely.
//   - RevenueCat: same shape, source: 'revenuecat', driven by their webhook.
//   - Until then: setEntitlement is exposed to admins only, as a manual comp
//     — "give this beta tester premium by hand" — from the admin panel.

import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export function watchEntitlement(uid, onData, onError) {
  if (!uid) {
    onData({ premium: false });
    return () => {};
  }
  return onSnapshot(
    doc(db, 'entitlements', uid),
    (snap) => onData(snap.exists() ? snap.data() : { premium: false }),
    (err) => onError?.(err)
  );
}

export async function getEntitlement(uid) {
  if (!uid) return { premium: false };
  const snap = await getDoc(doc(db, 'entitlements', uid));
  return snap.exists() ? snap.data() : { premium: false };
}

// Admin-only in the rules (or an Admin-SDK webhook, which the rules don't
// apply to at all). `source` records how it was granted, for support/audit —
// 'stripe' | 'revenuecat' | 'admin'.
export function setEntitlement(uid, { premium, plan = null, source = 'admin' }) {
  return setDoc(
    doc(db, 'entitlements', uid),
    { premium: !!premium, plan, source, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
