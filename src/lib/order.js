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

// The restaurant's own menu page, verified Sept 2026. Where a spot has an
// orderDirect link that *is* a menu (Toast/Square/Slice), that's used instead.
const MENU_URL = {
  'the-angry-beaver': 'https://theangrybeaverseattle.com/food-menu',
  'ghostfish-brewing': 'https://ghostfishbrewing.com/taproom',
  'a-stir': 'https://astirseattle.com/food-menu',
  'the-chicken-supply': 'https://thechickensupply.com/the-goods/',
  'askatu-bakery': 'https://liberatedfoods.com/food-menu',
  'yeobo-cafe': 'https://www.yeobosea.com/menu',
  'esters-enoteca': 'https://www.estersenoteca.com/menus',
  'palermo-pizza-pasta': 'https://www.mypalermopizza.com/#menu',
  'cafe-flora': 'https://florarestaurantgroup.com/restaurant/cafe-flora-seattle/',
  'musang-beacon-hill': 'https://www.musangseattle.com/menus',
  'bamboo-sushi-uvillage': 'https://bamboosushi.com/location/university-village/menu',
  'jacks-bbq': 'https://jacksbbq.com/menu/',
  'taylor-shellfish-melrose':
    'https://www.taylorshellfishfarms.com/locations/capitol-hill-melrose',
  'marination-ma-kai': 'https://marinationmobile.com/menu',
  'ba-bar-capitol-hill': 'https://www.babarseattle.com/capitol-hill/menu/',
  'portage-bay-cafe-ballard': 'https://www.portagebaycafe.com/menu',
  'arayas-place-u-district': 'https://www.arayasplace.com/our-menu',
  'fonda-la-catrina': 'https://www.fondalacatrina.com/menu',
  'mioposto-mount-baker': 'https://www.miopostopizza.com/menus',
  'nue-capitol-hill': 'https://www.nueseattle.com/online-menus',
  'sweet-alchemy-u-district': 'https://sweetalchemyicecreamery.com/flavors/',
  'harvest-beat': 'https://www.harvestbeat.com/',
  'cactus-madison-park': 'https://www.cactusrestaurants.com/menus',
  'cantina-monarca-bellevue': 'https://menu.cantinamonarca.com/',
  'cafe-organique-kirkland': 'https://www.cafeorganique.us/menu',
  'sano-cafe-mercer-island': 'https://www.thesanocafe.com/menu',
  'beardslee-public-house-bothell': 'https://beardsleeph.com/food-menu/',
};

// Best link to view the menu: the spot's own ordering page if that shows the
// menu, else its menu page, else its site. { url, label } or null.
export function menuLink(r) {
  const direct = DIRECT_ORDER[r.id];
  if (direct) {
    return {
      url: direct.url,
      label: direct.platform === 'their site' ? 'Menu' : `Menu (${direct.platform})`,
    };
  }
  if (MENU_URL[r.id]) return { url: MENU_URL[r.id], label: 'Full menu' };
  if (r.website) return { url: r.website, label: 'Their site' };
  return null;
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

export function grubhubSearch(r) {
  return affiliate('grubhub', `https://www.grubhub.com/search?queryText=${q(r)}`);
}

// The three aggregators, in one call, for the "choose a platform" step.
export const DELIVERY_APPS = [
  { key: 'doordash', label: 'DoorDash', link: doordashSearch },
  { key: 'grubhub', label: 'Grubhub', link: grubhubSearch },
  { key: 'ubereats', label: 'Uber Eats', link: uberEatsSearch },
];

export function deliveryLinks(r) {
  return DELIVERY_APPS.map((a) => ({ ...a, url: a.link(r) }));
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
