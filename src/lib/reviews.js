// Celiac safety reviews — star rating + "got glutened" flag + notes. This is
// the highest-value signal in the app, so it goes to the shared Firestore
// `reviews` collection when signed in (same cloud/local pattern as
// comments.js). Signed-out visitors still get a working on-device fallback so
// there's no login wall to browse or leave a quick review.

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

const REVIEWS = collection(db, 'reviews');
const LKEY = 'zgg.reviews.v1';

function shape(d) {
  const v = d.data();
  const created = v.createdAt?.toDate?.() ?? null;
  return {
    id: d.id,
    uid: v.uid,
    handle: v.handle || 'anon',
    restaurantId: v.restaurantId,
    rating: v.rating,
    glutened: !!v.glutened,
    text: v.text || '',
    date: (created ?? new Date()).toISOString(),
    pending: !created,
    cloud: true,
  };
}

export function watchReviews(restaurantId, onData, onError) {
  const q = query(REVIEWS, where('restaurantId', '==', restaurantId));
  return onSnapshot(
    q,
    (snap) =>
      onData(snap.docs.map(shape).sort((a, b) => b.date.localeCompare(a.date))),
    (err) => onError?.(err)
  );
}

export async function addCloudReview(restaurantId, { rating, glutened, text }) {
  const user = auth.currentUser;
  if (!user) throw new Error('not signed in');
  const ref = await addDoc(REVIEWS, {
    uid: user.uid,
    handle: currentHandle(),
    restaurantId,
    rating: Number(rating),
    glutened: Boolean(glutened),
    text: (text ?? '').trim().slice(0, 2000),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function deleteCloudReview(id) {
  return deleteDoc(doc(db, 'reviews', id));
}

// ---- on-device fallback (also the whole store pre-cloud-migration) ----

function readAll() {
  try {
    const raw = localStorage.getItem(LKEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(LKEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota) — reviews just won't persist
  }
}

// Local reviews for one spot. Also used as the cross-restaurant reader for
// points/leaderboard stats (profile.js) and the list-view rating badge
// (RestaurantList.jsx) — both device-scoped for now, same as before cloud
// sync existed. Rolling those up into a true community-wide average needs a
// server-side aggregate (Cloud Function) and is tracked as a follow-up.
export function getReviews(restaurantId) {
  const all = readAll();
  return all[restaurantId] ?? [];
}

export function addReview(restaurantId, { rating, glutened, text }) {
  const all = readAll();
  const list = all[restaurantId] ?? [];
  const review = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rating: Number(rating),
    glutened: Boolean(glutened),
    text: (text ?? '').trim(),
    date: new Date().toISOString(),
    cloud: false,
  };
  all[restaurantId] = [review, ...list];
  writeAll(all);
  return review;
}

export function deleteReview(restaurantId, reviewId) {
  const all = readAll();
  const list = all[restaurantId] ?? [];
  all[restaurantId] = list.filter((r) => r.id !== reviewId);
  writeAll(all);
}

export function summarize(reviews) {
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const glutenedCount = reviews.filter((r) => r.glutened).length;
  return {
    count: reviews.length,
    avgRating: Math.round(avg * 10) / 10,
    glutenedCount,
  };
}
