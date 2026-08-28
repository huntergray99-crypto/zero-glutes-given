// Neighborhood index, derived from the restaurant data itself — name, spot
// count, centroid, and bounds. No separate data file to keep in sync.

import { restaurants } from '../data/restaurants';

function avg(arr) {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

export const NEIGHBORHOODS = (() => {
  const groups = new Map();
  for (const r of restaurants) {
    if (r.honorableMention) continue; // celiac-safe spots define the map
    const g = groups.get(r.neighborhood) || { name: r.neighborhood, lats: [], lngs: [] };
    g.lats.push(r.lat);
    g.lngs.push(r.lng);
    groups.set(r.neighborhood, g);
  }
  return [...groups.values()]
    .map((g) => ({
      name: g.name,
      count: g.lats.length,
      center: [avg(g.lats), avg(g.lngs)],
      bounds: [
        [Math.min(...g.lats), Math.min(...g.lngs)],
        [Math.max(...g.lats), Math.max(...g.lngs)],
      ],
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
})();

export function neighborhoodSpotIds(name) {
  return restaurants.filter((r) => r.neighborhood === name).map((r) => r.id);
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
