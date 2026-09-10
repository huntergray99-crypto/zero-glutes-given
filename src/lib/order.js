// Delivery / pickup links and the late-night ride hand-off.
//
// Two tiers:
//   1. orderDirect(r) — the restaurant's own online ordering (Toast, Square,
//      Slice, their own site). Lower fees for the spot, and usually an order-
//      notes field where you can restate your celiac needs. Preferred.
//   2. doordashSearch / uberEatsSearch — aggregator searches (not deep links to
//      a confirmed listing), affiliate-wrapped when the programs are configured.

import { affiliate } from './affiliate';

// Restaurant's own online ordering, where we've confirmed one. id → {url, platform}.
const DIRECT_ORDER = {
  'the-angry-beaver': {
    url: 'https://www.toasttab.com/local/order/angry-beaver-8412-greenwood-ave-n/r-8ad27b12-8de0-4624-8f38-504d4f36fdca',
    platform: 'Toast',
  },
  'the-chicken-supply': {
    url: 'https://order.toasttab.com/online/the-chicken-supply-7410-greenwood-ave-n',
    platform: 'Toast',
  },
  nuflours: { url: 'https://nuflours.com', platform: 'their site' },
  'askatu-bakery': { url: 'https://liberatedfoods.com', platform: 'their site' },
  'razzis-pizzeria': {
    url: 'https://slicelife.com/restaurants/wa/seattle/98103/razzi-s-pizza/menu',
    platform: 'Slice',
  },
  'frelard-tamales': {
    url: 'https://frelard-tamales.square.site/s/order',
    platform: 'Square',
  },
  'frankie-and-jos': {
    url: 'https://frankieandjos.com/collections/online-flavors',
    platform: 'their site',
  },
  'tacos-chukis-broadway': {
    url: 'https://www.seattlechukis.com/s/order',
    platform: 'their site',
  },
  'portage-bay-cafe-ballard': {
    url: 'https://www.portagebaycafe.com/ballard',
    platform: 'Toast',
  },
};

export function orderDirect(r) {
  return DIRECT_ORDER[r.id] || null;
}

function q(r) {
  return encodeURIComponent(
    [r.name, r.neighborhood, 'Seattle'].filter(Boolean).join(' ')
  );
}

export function doordashSearch(r) {
  return affiliate(
    'doordash',
    `https://www.doordash.com/search/store/${q(r)}`
  );
}

export function uberEatsSearch(r) {
  return affiliate('ubereats', `https://www.ubereats.com/search?q=${q(r)}`);
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
