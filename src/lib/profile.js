// Handle + local check-in storage, and the points/level math shared by both
// the cloud and on-device check-in paths (see checkins.js + CloudContext for
// the cloud side — this module owns the local fallback and the pure stats
// calculation, which doesn't care where the check-ins came from).

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
  post: 5, // share a photo/tip to the feed
};

const LATE_START_HR = 22; // 10pm — a "night owl" check-in

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

// The on-device check-in store: { [restaurantId]: [{ date, verified }] }.
// Read/written directly by the local fallback path in CloudContext, and by
// the one-time migration into the cloud on sign-in.
export function readLocalCheckIns() {
  return read().checkIns;
}

export function writeLocalCheckIns(map) {
  const data = read();
  data.checkIns = map;
  write(data);
}

// { allowed, nextAllowedAt } — nextAllowedAt is an epoch ms once on cooldown.
// Pure: takes a visit list directly so it works for both the cloud and
// on-device check-in paths.
export function checkInStatus(visits, now = Date.now()) {
  if (!visits?.length) return { allowed: true, nextAllowedAt: null };
  const last = new Date(visits.at(-1).date).getTime();
  const nextAllowedAt = last + CHECKIN_COOLDOWN_MS;
  return { allowed: now >= nextAllowedAt, nextAllowedAt };
}

// Historical cleanup: collapse multiple check-ins at one spot within any 24h
// window down to the first (preferring a GPS-verified one). Runs once, local
// data only — pre-dates cloud sync.
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

// `posts` is the count of feed posts by this person, and `checkIns` is
// { [restaurantId]: visits[] } — cloud when signed in, on-device otherwise.
// Both are passed in because neither lives in this module anymore.
export function computeStats({ posts = 0, checkIns = {} } = {}) {
  const byId = Object.fromEntries(restaurants.map((r) => [r.id, r]));

  let points = 0;
  let totalCheckIns = 0;
  let featuredVisited = 0;
  let lateCheckIn = false;
  const hoods = new Set();
  const punchCard = [];

  for (const [id, list] of Object.entries(checkIns)) {
    const r = byId[id];
    if (!r || !list?.length) continue;
    totalCheckIns += list.length;
    if (r.featured) featuredVisited += 1;
    hoods.add(r.neighborhood);

    list.forEach((c, i) => {
      points += c.verified ? POINTS.verifiedCheckIn : POINTS.checkIn;
      if (i === 0) points += POINTS.discovery;
      if (r.featured) points += POINTS.featuredBonus;
      const hr = new Date(c.date).getHours();
      if (hr >= LATE_START_HR || hr < 4) lateCheckIn = true;
    });

    punchCard.push({ restaurant: r, count: list.length, last: list.at(-1).date });
  }

  const reviewsWritten = restaurants.reduce(
    (n, r) => n + getReviews(r.id).length,
    0
  );
  points += reviewsWritten * POINTS.review;
  points += posts * POINTS.post;

  punchCard.sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));

  const level =
    [...LEVELS].reverse().find((l) => points >= l.min) ?? LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.min > points) ?? null;

  return {
    handle: read().handle,
    points,
    level,
    nextLevel,
    totalCheckIns,
    uniqueSpots: punchCard.length,
    featuredVisited,
    reviewsWritten,
    posts,
    neighborhoods: hoods.size,
    lateCheckIn,
    punchCard,
  };
}
