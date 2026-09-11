// The restaurant list the whole app should read.
//
// Starts synchronously as the bundled baseline, so every module that derives
// something at import time (neighborhood index, browse rails) still works with
// no async plumbing and no loading state. Firestore overrides are applied on
// top as they arrive, and subscribers re-render.

import { useSyncExternalStore } from 'react';
import { restaurants as BASE } from '../data/restaurants';
import { watchOverrides, cleanOverride, auditOf } from './overrides';

const byIdBase = new Map(BASE.map((r) => [r.id, r]));

let overrides = {};
let all = BASE; // includes spots marked closed
let live = BASE; // what the app shows
const subscribers = new Set();

function rebuild() {
  const merged = new Map(byIdBase);
  for (const [id, raw] of Object.entries(overrides)) {
    const fields = cleanOverride(raw);
    const base = merged.get(id);
    if (base) {
      merged.set(id, { ...base, ...fields, id, _override: auditOf(raw) });
    } else if (fields.name && fields.lat != null && fields.lng != null) {
      // a spot added entirely at runtime, with no bundled counterpart
      merged.set(id, {
        cuisine: [],
        safetyLevel: 'gf-menu',
        priceLevel: 2,
        ...fields,
        id,
        _override: auditOf(raw),
      });
    }
  }
  all = [...merged.values()];
  live = all.filter((r) => !r.closed);
  subscribers.forEach((fn) => fn(live));
}

// Every spot the app should show (closed ones removed).
export function getRestaurants() {
  return live;
}

// Including spots closed by an override — admin views want these.
export function getAllRestaurants() {
  return all;
}

export function getRestaurant(id) {
  return all.find((r) => r.id === id) || null;
}

export function subscribe(fn) {
  startOverrides(); // first subscriber opens the listener
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// One listener for the whole app. Failures are non-fatal by design: with no
// connection (or before rules are published) the bundled baseline is what
// everyone sees, which is the offline behaviour we want anyway.
let started = false;
export function startOverrides() {
  if (started) return;
  started = true;
  watchOverrides(
    (map) => {
      overrides = map;
      rebuild();
    },
    (err) => console.error('overrides listener', err)
  );
}

// Both snapshots are stable identities between rebuilds, so these are safe
// external-store reads — no effect, no render loop, no missed update between
// first render and subscribe.
export function useRestaurants() {
  return useSyncExternalStore(subscribe, getRestaurants);
}

export function useAllRestaurants() {
  return useSyncExternalStore(subscribe, getAllRestaurants);
}
