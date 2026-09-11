// Rails for the browse screen — DoorDash-style horizontal shelves built from
// the restaurant data (plus an optional location for a "Near you" shelf).

import { activeCity } from '../data/cities';
import { getRestaurants } from './restaurantStore';
import { REGION_ORDER, regionForHood } from './neighborhoods';
import { haversineMiles } from './geo';

function bySpotlightThenFeatured(a, b) {
  return (
    (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0) ||
    (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
    a.name.localeCompare(b.name)
  );
}

// Cuisines to surface as their own shelf, in the order we want them, when at
// least MIN_PER_CUISINE celiac-safe spots carry the tag.
const CUISINE_RAILS = [
  ['Pizza', '🍕 Pizza & Italian', ['Pizza', 'Italian']],
  ['Mexican', '🌮 Tacos & Mexican', ['Mexican']],
  ['Bakery & Sweets', '🥐 Bakeries & sweets', ['Bakery & Sweets']],
  ['Bars & Breweries', '🍺 Bars & breweries', ['Bars & Breweries']],
  ['Asian', '🍜 Asian', ['Asian']],
  ['Brunch', '🍳 Brunch & breakfast', ['Brunch']],
  ['Seafood', '🦪 Seafood', ['Seafood']],
  ['Vegan & Veggie', '🥗 Vegan & veggie', ['Vegan & Veggie', 'Bowls & Salads']],
];
const MIN_PER_CUISINE = 3;

// A rail is { key, title, subtitle?, spots: [...], filter?: partial filter to
// apply when the user taps "See all" }.
export function buildRails({ position, restaurants } = {}) {
  const CELIAC = (restaurants || getRestaurants()).filter(
    (r) => !r.honorableMention
  );
  const rails = [];

  if (position) {
    const near = [...CELIAC]
      .map((r) => ({ r, d: haversineMiles(position, r) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 10)
      .map(({ r, d }) => ({ ...r, _distMi: d }));
    if (near.length) {
      rails.push({
        key: 'near',
        title: '📍 Closest to you',
        spots: near,
      });
    }
  }

  rails.push({
    key: 'featured',
    title: '⭐ Community favorites',
    subtitle: `The spots the ${activeCity.name} GF crowd rallies around`,
    spots: CELIAC.filter((r) => r.featured).sort(bySpotlightThenFeatured),
  });

  rails.push({
    key: 'dedicated',
    title: '🛡️ Dedicated gluten-free kitchens',
    subtitle: 'Zero gluten on the premises — the safest bet',
    spots: CELIAC.filter((r) => r.safetyLevel === 'dedicated').sort(
      bySpotlightThenFeatured
    ),
    filter: { safety: ['dedicated'] },
  });

  const late = CELIAC.filter((r) => r.lateNight).sort(bySpotlightThenFeatured);
  if (late.length) {
    rails.push({
      key: 'late',
      title: '🌙 Open late',
      subtitle: 'Kitchens still going when the night is',
      spots: late,
      filter: { openLate: true },
    });
  }

  // Regions outside the core city — one combined shelf so the expansion is
  // visible.
  const core = REGION_ORDER[0];
  const beyond = CELIAC.filter(
    (r) => regionForHood(r.neighborhood) !== core
  ).sort(bySpotlightThenFeatured);
  if (beyond.length) {
    rails.push({
      key: 'beyond',
      title: `🌉 Beyond ${core}`,
      subtitle: REGION_ORDER.filter((x) => x !== core).join(' · '),
      spots: beyond,
    });
  }

  rails.push({
    key: 'fryer',
    title: '🍟 Dedicated fryers',
    subtitle: 'Fried food you can actually order',
    spots: CELIAC.filter((r) => r.dedicatedFryer).sort(bySpotlightThenFeatured),
    filter: { dedicatedFryer: true },
  });

  for (const [tag, title, matchTags] of CUISINE_RAILS) {
    const spots = CELIAC.filter((r) =>
      r.cuisine.some((c) => matchTags.includes(c))
    ).sort(bySpotlightThenFeatured);
    if (spots.length >= MIN_PER_CUISINE) {
      rails.push({ key: `cuisine-${tag}`, title, spots, filter: { cuisine: [tag] } });
    }
  }

  return rails;
}
