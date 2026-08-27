// Local profile: check-ins ("punch card"), points, handle. localStorage only for
// now — one device, no account. A backend swap later keeps this same shape.

import { restaurants } from '../data/restaurants';
import { getReviews } from './reviews';

const KEY = 'zgg.profile.v1';

const EMPTY = {
  handle: '',
  checkIns: {}, // { [restaurantId]: [{ date, verified }] }
};

export const POINTS = {
  checkIn: 10,
  verifiedCheckIn: 20, // GPS confirmed you were there
  discovery: 20, // first-ever check-in at a spot
  featuredBonus: 25, // check-in at a featured restaurant
  review: 15,
};

// One check-in per place per 24h — keeps the punch card and points honest.
export const CHECKIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const LEVELS = [
  { name: 'Crumb', min: 0 },
  { name: 'Nibbler', min: 100 },
  { name: 'Regular', min: 300 },
  { name: 'Gluten-Free Gourmand', min: 700 },
  { name: 'Celiac Sommelier', min: 1500 },
  { name: 'Zero Glutes Legend', min: 3000 },
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getProfile() {
  return read();
}

export function setHandle(handle) {
  const data = read();
  data.handle = handle.slice(0, 24);
  write(data);
  return data;
}

export function getVisits(restaurantId) {
  return read().checkIns[restaurantId] ?? [];
}

// { allowed, nextAllowedAt } — nextAllowedAt is an epoch ms once on cooldown.
export function checkInStatus(restaurantId, now = Date.now()) {
  const list = read().checkIns[restaurantId] ?? [];
  if (!list.length) return { allowed: true, nextAllowedAt: null };
  const last = new Date(list.at(-1).date).getTime();
  const nextAllowedAt = last + CHECKIN_COOLDOWN_MS;
  return { allowed: now >= nextAllowedAt, nextAllowedAt };
}

export function checkIn(restaurantId, { verified = false } = {}) {
  const now = Date.now();
  const status = checkInStatus(restaurantId, now);
  if (!status.allowed) {
    return { ok: false, nextAllowedAt: status.nextAllowedAt };
  }
  const data = read();
  const list = data.checkIns[restaurantId] ?? [];
  const isFirst = list.length === 0;
  list.push({ date: new Date(now).toISOString(), verified });
  data.checkIns[restaurantId] = list;
  write(data);
  return { ok: true, isFirst, count: list.length };
}

export function undoLastCheckIn(restaurantId) {
  const data = read();
  const list = data.checkIns[restaurantId] ?? [];
  list.pop();
  if (list.length) data.checkIns[restaurantId] = list;
  else delete data.checkIns[restaurantId];
  write(data);
}

// Historical cleanup: collapse multiple check-ins at one spot within any 24h
// window down to the first (preferring a GPS-verified one). Runs once.
export function dedupeCheckIns() {
  const data = read();
  let changed = false;
  for (const [id, list] of Object.entries(data.checkIns)) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const kept = [];
    for (const c of sorted) {
      const prev = kept[kept.length - 1];
      if (
        prev &&
        new Date(c.date).getTime() - new Date(prev.date).getTime() <
          CHECKIN_COOLDOWN_MS
      ) {
        if (c.verified && !prev.verified) kept[kept.length - 1] = { ...prev, verified: true };
        continue;
      }
      kept.push(c);
    }
    if (kept.length !== list.length) {
      data.checkIns[id] = kept;
      changed = true;
    }
  }
  if (changed) write(data);
  return changed;
}

// ---- derived stats ----

export function computeStats() {
  const data = read();
  const byId = Object.fromEntries(restaurants.map((r) => [r.id, r]));

  let points = 0;
  let totalCheckIns = 0;
  let featuredVisited = 0;
  const punchCard = [];

  for (const [id, list] of Object.entries(data.checkIns)) {
    const r = byId[id];
    if (!r) continue;
    totalCheckIns += list.length;
    if (r.featured) featuredVisited += 1;

    list.forEach((c, i) => {
      points += c.verified ? POINTS.verifiedCheckIn : POINTS.checkIn;
      if (i === 0) points += POINTS.discovery;
      if (r.featured) points += POINTS.featuredBonus;
    });

    punchCard.push({ restaurant: r, count: list.length, last: list.at(-1).date });
  }

  const reviewsWritten = restaurants.reduce(
    (n, r) => n + getReviews(r.id).length,
    0
  );
  points += reviewsWritten * POINTS.review;

  punchCard.sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));

  const level =
    [...LEVELS].reverse().find((l) => points >= l.min) ?? LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.min > points) ?? null;

  return {
    handle: data.handle,
    points,
    level,
    nextLevel,
    totalCheckIns,
    uniqueSpots: punchCard.length,
    featuredVisited,
    reviewsWritten,
    punchCard,
  };
}
