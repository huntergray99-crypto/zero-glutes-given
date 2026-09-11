// Shared matcher for the header search — used by both the dropdown suggestions
// and the filtered list/map, so they never disagree. Handles hyphens/spacing
// and the active market's local nicknames.

import { activeCity } from '../data/cities';

const ALIASES = activeCity.searchAliases;

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[-_.'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function matchRestaurant(r, rawQuery) {
  const q = norm(rawQuery);
  if (!q) return true;
  const needles = ALIASES[q] ? [q, ALIASES[q]] : [q];
  const hay = norm(`${r.name} ${r.neighborhood} ${r.cuisine.join(' ')}`);
  return needles.some((n) => hay.includes(n));
}
