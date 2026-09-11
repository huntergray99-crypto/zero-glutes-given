// Neighborhood index, derived from the restaurant data itself — name, spot
// count, centroid, and bounds. No separate data file to keep in sync.

import { getRestaurants, subscribe } from './restaurantStore';
import { activeCity } from '../data/cities';

function avg(arr) {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

// Metro regions, from the active market config. Anything not listed falls
// back to the core city's region so new core-city neighborhoods keep working
// without a code change.
export const REGION_ORDER = activeCity.regions;

export function regionForHood(name) {
  return activeCity.regionByHood[name] || REGION_ORDER[0];
}

function buildIndex(list) {
  const groups = new Map();
  for (const r of list) {
    if (r.honorableMention) continue; // celiac-safe spots define the map
    const g = groups.get(r.neighborhood) || { name: r.neighborhood, lats: [], lngs: [] };
    g.lats.push(r.lat);
    g.lngs.push(r.lng);
    groups.set(r.neighborhood, g);
  }
  return [...groups.values()]
    .map((g) => ({
      name: g.name,
      region: regionForHood(g.name),
      count: g.lats.length,
      center: [avg(g.lats), avg(g.lngs)],
      bounds: [
        [Math.min(...g.lats), Math.min(...g.lngs)],
        [Math.max(...g.lats), Math.max(...g.lngs)],
      ],
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function groupByRegion(hoods) {
  return REGION_ORDER.map((region) => ({
    region,
    hoods: hoods.filter((n) => n.region === region),
  })).filter((g) => g.hoods.length);
}

// Live bindings: these start from the bundled baseline and are rebuilt when a
// runtime override changes the spot list (a spot closes, a neighborhood is
// corrected). ES module exports are live, so importers see the new value on
// their next read — which React drives via the re-render from useRestaurants.
export let NEIGHBORHOODS = buildIndex(getRestaurants());
export let REGIONS = groupByRegion(NEIGHBORHOODS);

subscribe((list) => {
  NEIGHBORHOODS = buildIndex(list);
  REGIONS = groupByRegion(NEIGHBORHOODS);
});

export function neighborhoodSpotIds(name) {
  return getRestaurants()
    .filter((r) => r.neighborhood === name)
    .map((r) => r.id);
}

// Closest neighborhood centroid to a {lat,lng} — for "use my location".
export function nearestNeighborhood(pos) {
  let best = null;
  for (const n of NEIGHBORHOODS) {
    const dLat = n.center[0] - pos.lat;
    const dLng = n.center[1] - pos.lng;
    const d = dLat * dLat + dLng * dLng;
    if (!best || d < best.d) best = { n, d };
  }
  return best ? best.n : null;
}

const HOOD_KEY = 'zgg.hood';
const SEEN_KEY = 'zgg.hoodSeen';

export function getHood() {
  try {
    const v = localStorage.getItem(HOOD_KEY);
    return v && NEIGHBORHOODS.some((n) => n.name === v) ? v : null;
  } catch {
    return null;
  }
}

export function setHood(name) {
  try {
    if (name) localStorage.setItem(HOOD_KEY, name);
    else localStorage.removeItem(HOOD_KEY);
  } catch {
    /* ignore */
  }
}

export function hoodSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHoodSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}
