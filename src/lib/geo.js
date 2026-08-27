// Distance helpers. All distances in miles.

const EARTH_MI = 3958.8;

export function haversineMiles(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.sqrt(h));
}

export function formatDistance(miles) {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

// walking minutes at ~3 mph
export function walkMinutes(miles) {
  return Math.max(1, Math.round((miles / 3) * 60));
}

export function nearest(from, restaurants) {
  let best = null;
  for (const r of restaurants) {
    const d = haversineMiles(from, r);
    if (!best || d < best.miles) best = { restaurant: r, miles: d };
  }
  return best;
}
