// Delivery / pickup search links and the late-night ride hand-off. These are
// searches (not deep links to a confirmed listing), so they degrade gracefully
// whether or not a spot is actually on the platform.

function q(r) {
  return encodeURIComponent(
    [r.name, r.neighborhood, 'Seattle'].filter(Boolean).join(' ')
  );
}

export function doordashSearch(r) {
  return `https://www.doordash.com/search/store/${q(r)}`;
}

export function uberEatsSearch(r) {
  return `https://www.ubereats.com/search?q=${q(r)}`;
}

// Order-ahead on the restaurant's own site, when they have one.
export function websiteOrder(r) {
  return r.website || null;
}

// Night owls: after ~10pm, offer a ride to the door. Uber's universal link
// pre-fills the dropoff; pickup is left as the rider's current location.
export function rideUrl(r) {
  const p = new URLSearchParams({
    action: 'setPickup',
    'pickup[formatted_address]': 'Current Location',
    'dropoff[latitude]': String(r.lat),
    'dropoff[longitude]': String(r.lng),
    'dropoff[nickname]': r.name,
  });
  return `https://m.uber.com/ul/?${p.toString()}`;
}

// Local time is "late" from 10pm to 4am.
export function isLateNow(d = new Date()) {
  const h = d.getHours();
  return h >= 22 || h < 4;
}
