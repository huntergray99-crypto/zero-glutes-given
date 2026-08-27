// Per-device reviews stored in localStorage. No backend, no accounts — reviews live
// only in the browser that wrote them. This keeps the MVP free to host as a static
// site. Swapping this module for a real API later is the only change needed.

const KEY = 'zgg.reviews.v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota) — reviews just won't persist
  }
}

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
