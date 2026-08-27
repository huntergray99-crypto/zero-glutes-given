export const SAFETY_META = {
  dedicated: {
    label: '100% gluten-free facility',
    short: 'Dedicated GF',
    color: '#1b7f4b',
    blurb: 'No gluten anywhere on the premises. Safest possible option.',
  },
  'celiac-friendly': {
    label: 'Celiac-friendly kitchen',
    short: 'Celiac-friendly',
    color: '#2f6fb0',
    blurb:
      'Gluten is in the kitchen, but there are documented separate-prep protocols and trained staff.',
  },
  'gf-menu': {
    label: 'Gluten-free menu, shared kitchen',
    short: 'GF menu',
    color: '#b07d2f',
    blurb:
      'Marked GF options in a shared kitchen. Ask about cross-contamination protocols before ordering.',
  },
  honorable: {
    label: 'Honorable mention',
    short: 'Honorable mention',
    color: '#8a8f98',
    blurb:
      'Not a gluten-free kitchen. Listed because it is healthy, affordable, and has lots of naturally gluten-free options. Cross-contamination is likely — good for a low-risk quick bite, not a celiac-safe meal.',
  },
};

export function priceLabel(level) {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)));
}

// iOS / iPadOS / macOS → Apple Maps; everything else → Google Maps.
export function isApplePlatform() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const iOS = /iPhone|iPad|iPod/.test(ua);
  const iPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const mac = /Macintosh|Mac OS X/.test(ua);
  return (iOS || iPadOS || mac) && !/Android|Windows/.test(ua);
}

// Directions from `from` (optional {lat,lng}) to a restaurant, on the map app
// that matches the user's device.
export function directionsUrl(r, from) {
  const dest = `${r.lat},${r.lng}`;
  if (isApplePlatform()) {
    const params = new URLSearchParams({ daddr: dest, dirflg: 'w' });
    if (from) params.set('saddr', `${from.lat},${from.lng}`);
    return `https://maps.apple.com/?${params.toString()}`;
  }
  const params = new URLSearchParams({
    api: '1',
    destination: dest,
    travelmode: 'walking',
  });
  if (from) params.set('origin', `${from.lat},${from.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function directionsProvider() {
  return isApplePlatform() ? 'Apple Maps' : 'Google Maps';
}

export function verifiedLabel(iso) {
  if (!iso) return null;
  const [y, m] = iso.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[Number(m) - 1]} ${y}`;
}
