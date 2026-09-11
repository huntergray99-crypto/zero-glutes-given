// Market configuration. Everything that is true of "the city this build
// serves" lives here rather than being hardcoded across the app, so standing
// up a new market is: add an entry, point VITE_CITY at it, supply restaurant
// data. No code changes in components.
//
// One market is active per build (VITE_CITY, default 'seattle'). That keeps
// the bundle to one city's data and lets each market have its own domain,
// meta tags, and analytics without a runtime city switcher.

export const CITIES = {
  seattle: {
    id: 'seattle',
    // The core municipality. Used for delivery-app search fallbacks when a
    // restaurant's own address doesn't give us a city.
    name: 'Seattle',
    state: 'WA',
    // Header subtitle / share copy — names the whole served area, which is
    // usually wider than the core city.
    area: 'Seattle & the Eastside',
    // Map defaults before we have a location fix.
    center: [47.615, -122.33],
    zoom: 12,
    // Regions in display order. The first is the core city; anything not in
    // regionByHood below falls back to it, so new core-city neighborhoods
    // work without a code change.
    regions: ['Seattle', 'Eastside', 'North', 'South'],
    regionByHood: {
      Bellevue: 'Eastside',
      Kirkland: 'Eastside',
      Redmond: 'Eastside',
      'Mercer Island': 'Eastside',
      Bothell: 'North',
      'Federal Way': 'South',
      Renton: 'South',
      Kent: 'South',
      Tukwila: 'South',
    },
    // Local shorthand people actually type into search.
    searchAliases: {
      'u district': 'university district',
      udistrict: 'university district',
      'the ave': 'university district',
      'cap hill': 'capitol hill',
      caphill: 'capitol hill',
      'u village': 'university village',
      uvillage: 'university village',
      slu: 'south lake union',
    },
  },
};

export const activeCity =
  CITIES[import.meta.env.VITE_CITY] || CITIES.seattle;

// The municipality a spot is actually in, read off its address
// ("… , Bellevue, WA 98004" → "Bellevue"). Falls back to the market's core
// city. This is what delivery-app searches need — sending "Bellevue Seattle"
// to DoorDash finds nothing.
export function cityOf(restaurant) {
  const parts = (restaurant?.address || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  // last part is "WA 98004"; the city is the one before it
  if (parts.length >= 2) return parts[parts.length - 2];
  return activeCity.name;
}

export function stateOf(restaurant) {
  const last = (restaurant?.address || '').split(',').pop()?.trim() || '';
  return last.split(/\s+/)[0] || activeCity.state;
}
