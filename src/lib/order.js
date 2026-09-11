// Delivery / pickup links and the late-night ride hand-off.
//
// Two tiers:
//   1. orderDirect(r) — the restaurant's own online ordering (Toast, Square,
//      Slice, their own site). Lower fees for the spot, and usually an order-
//      notes field where you can restate your celiac needs. Preferred.
//   2. doordashSearch / uberEatsSearch — aggregator searches (not deep links to
//      a confirmed listing), affiliate-wrapped when the programs are configured.

import { affiliate } from './affiliate';
import { cityOf, stateOf } from '../data/cities';

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

// Delivery-app search text. The city comes off the restaurant's own address,
// not the market config — a Bellevue spot searched as "… Bellevue Seattle"
// returns nothing on DoorDash. The neighborhood is dropped when it's just
// the city again (true for every suburb in the dataset).
function q(r) {
  const city = cityOf(r);
  const hood = r.neighborhood === city ? null : r.neighborhood;
  return encodeURIComponent(
    [r.name, hood, city, stateOf(r)].filter(Boolean).join(' ')
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

const SEARCH = { doordash: doordashSearch, grubhub: grubhubSearch, ubereats: uberEatsSearch };
const LABEL = { doordash: 'DoorDash', grubhub: 'Grubhub', ubereats: 'Uber Eats' };

// Which delivery apps each spot is actually on, web-verified Sept 2026.
//   'https://…'  → confirmed, deep link to that store page
//   true         → confirmed on the platform, no stable deep link (use search)
//   (key absent) → NOT on that platform
//   {}           → app delivery not offered — order from their own site
//   (id absent from map) → unverified; fall back to all three as searches
const DELIVERY = {
  'the-angry-beaver': {
    doordash: 'https://www.doordash.com/store/the-angry-beaver-8412-greenwood-ave-n-seattle-32776175/',
    grubhub: 'https://www.grubhub.com/restaurant/the-angry-beaver-8412-greenwood-ave-n-seattle/9237216',
  },
  'ghostfish-brewing': {
    doordash: 'https://www.doordash.com/store/ghostfish-brewing-company-seattle-915642',
    grubhub: true,
    ubereats: true,
  },
  'a-stir': { ubereats: 'https://www.ubereats.com/store/a-stir/C10C1H21REy1KXDeGCYDXQ' },
  nuflours: {
    doordash: 'https://www.doordash.com/store/nuflours-seattle-114186/',
    grubhub: 'https://www.grubhub.com/restaurant/nuflours-518-15th-ave-e-seattle/2332090',
  },
  'the-chicken-supply': {
    grubhub: 'https://www.grubhub.com/restaurant/the-chicken-supply-7410-greenwood-ave-n-seattle/9128648',
  },
  'razzis-pizzeria': {
    doordash: 'https://www.doordash.com/store/razzis-pizzeria-seattle-1580495/',
    grubhub: 'https://www.grubhub.com/restaurant/razzis-pizzeria-8523-greenwood-ave-n-seattle/206116',
    ubereats: 'https://www.ubereats.com/store/razzis-pizzeria-greenwood/-Fm4o8ioQteREhMwvCxFbg',
  },
  'esters-enoteca': {
    doordash: true,
    grubhub: 'https://www.grubhub.com/restaurant/esters-enoteca-3416-fremont-avenue-north-seattle/1552669',
  },
  'musang-beacon-hill': {},
  'bamboo-sushi-uvillage': {
    doordash: 'https://www.doordash.com/store/bamboo-sushi-seattle-1025430/',
    ubereats: 'https://www.ubereats.com/store/bamboo-sushi-university-village/xmCH7wqdU7e5S5WYHFfVzg',
  },
  'jacks-bbq': {
    doordash: true,
    grubhub: true,
    ubereats: 'https://www.ubereats.com/store/jacks-bbq-sodo/spDk5H4ARwKUYfaP8VCAyw',
  },
  'taylor-shellfish-melrose': {},
  'marination-ma-kai': {
    doordash: 'https://www.doordash.com/store/marination-seattle-36465',
    grubhub: 'https://www.grubhub.com/restaurant/marination-ma-kai-1660-harbor-avenue-southwest-seattle/1543591',
    ubereats: 'https://www.ubereats.com/store/marination-ma-kai/KwrzZ-wlQMirOiUchBgWhw',
  },
  'ba-bar-capitol-hill': {
    doordash: 'https://www.doordash.com/store/ba-bar-seattle-59605',
    grubhub: 'https://www.grubhub.com/restaurant/ba-bar-550-12th-ave-seattle/2365744',
    ubereats: 'https://www.ubereats.com/store/ba-bar-capitol-hill/8Acbv6QmRGK9VVl5H1SjZw',
  },
  'portage-bay-cafe-ballard': {
    doordash: true,
    grubhub: 'https://www.grubhub.com/restaurant/portage-bay-cafe---ballard-2821-nw-market-st-seattle/8023472',
    ubereats: 'https://www.ubereats.com/store/portage-bay-cafe-ballard/ZSbd7JaBR66e-WYPbma5aQ',
  },
  'arayas-place-u-district': {
    doordash: 'https://www.doordash.com/store/37139/',
    grubhub: 'https://www.grubhub.com/restaurant/arayas-place-5240-university-way-seattle/1257509',
    ubereats: 'https://www.ubereats.com/store/arayas-place-u-district/Wmmjk8oSS-CkALgiFRms5A',
  },
  'frelard-tamales': { doordash: true, ubereats: true },
  'fonda-la-catrina': {
    grubhub: 'https://www.grubhub.com/restaurant/fonda-la-catrina-5905-airport-way-s-seattle/2343807',
    ubereats: 'https://www.ubereats.com/store/fonda-la-catrina/JkqVbeSuRYqI6UO3ACJm6Q',
  },
  'mioposto-mount-baker': {
    doordash: 'https://www.doordash.com/store/mioposto-seattle-39368/',
    grubhub: 'https://www.grubhub.com/restaurant/mioposto-mt-baker-3601-s-mcclellan-st-seattle/8812168',
    ubereats: 'https://www.ubereats.com/store/mioposto-pizzeria-mt-baker/q--FzkUiWJmHglzazPlAPA',
  },
  'nue-capitol-hill': { doordash: true, grubhub: true },
  'tacos-chukis-broadway': {},
  'harvest-beat': {},
  'sankaku-onigiri': {},
  'cactus-madison-park': {
    doordash: 'https://www.doordash.com/store/cactus-restaurants-seattle-32772/',
    grubhub: 'https://www.grubhub.com/restaurant/cactus-4220-e-madison-st-seattle/1338659',
    ubereats: 'https://www.ubereats.com/store/cactus-madison-park/HGTA79FNS1mbK-Ft4vqrdw',
  },
  'cantina-monarca-bellevue': {
    doordash: 'https://www.doordash.com/store/cantina-monarca-bellevue-32560065/',
  },
  'frankie-and-jos': {
    doordash: "https://www.doordash.com/store/frankie-&-jo's-seattle-619757/",
    ubereats: 'https://www.ubereats.com/store/frankie-&-jos-capitol-hill-1010-e-union-st/RSjCGAmIVj-MhXYNwknP7Q',
  },
  'palermo-pizza-pasta': {
    doordash: 'https://www.doordash.com/store/palermo-seattle-37974/',
    grubhub: 'https://www.grubhub.com/restaurant/palermo-pizza--pasta-350-15th-ave-e-seattle/77301',
    ubereats: 'https://www.ubereats.com/store/palermo/RkEII029QNmKQDTeUT2ikw',
  },
  'beardslee-public-house-bothell': {
    doordash: 'https://www.doordash.com/store/beardslee-public-house-bothell-27990865/',
    grubhub: 'https://www.grubhub.com/restaurant/beardslee-public-house-19116-beardslee-blvd-bothell/1400972',
    ubereats: 'https://www.ubereats.com/store/beardslee-public-house-19116-beardslee-blvd-bothell/dDFbAFiZUle5AEDSJGSZnA',
  },
  'theary-cambodian-foods-federal-way': {},
};

const ORDER = ['doordash', 'grubhub', 'ubereats'];

// The delivery apps to offer for a spot: [{ key, label, url }]. Empty when the
// spot doesn't do app delivery.
export function deliveryLinks(r) {
  const entry = DELIVERY[r.id];
  const keys = entry
    ? ORDER.filter((k) => entry[k])
    : ORDER; // unverified → best-effort search links for all three
  return keys.map((k) => ({
    key: k,
    label: LABEL[k],
    url: typeof entry?.[k] === 'string' ? entry[k] : SEARCH[k](r),
  }));
}

// True when we know the spot takes no aggregator orders (own site only).
export function pickupOnly(r) {
  const entry = DELIVERY[r.id];
  return Boolean(entry) && ORDER.every((k) => !entry[k]);
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
