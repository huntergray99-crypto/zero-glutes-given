// Shared matcher for the header search — used by both the dropdown suggestions
// and the filtered list/map, so they never disagree. Handles hyphens/spacing
// and a few Seattle nicknames.

const ALIASES = {
  'u district': 'university district',
  udistrict: 'university district',
  'the ave': 'university district',
  'cap hill': 'capitol hill',
  caphill: 'capitol hill',
  'u village': 'university village',
  uvillage: 'university village',
  slu: 'south lake union',
};

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
