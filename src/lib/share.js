// Share links. Deep link format: ?spot=<restaurantId> — App reads it on load
// and opens that restaurant.

import { SAFETY_META } from './format';
import { activeCity, cityOf } from '../data/cities';

export function appUrl() {
  return `${location.origin}${location.pathname}`;
}

export function spotUrl(r) {
  return `${appUrl()}?spot=${encodeURIComponent(r.id)}`;
}

async function shareOrCopy({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
      // fall through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function shareSpot(r) {
  const city = cityOf(r);
  const where = r.neighborhood === city ? city : `${r.neighborhood}, ${city}`;
  return shareOrCopy({
    title: `${r.name} — Zero Glutes Given`,
    text: `${r.name} — ${SAFETY_META[r.safetyLevel].short}, ${where}`,
    url: spotUrl(r),
  });
}

export function shareApp() {
  return shareOrCopy({
    title: 'Zero Glutes Given',
    text: `Celiac-safe dining in ${activeCity.area} — a map of gluten-free spots.`,
    url: appUrl(),
  });
}
