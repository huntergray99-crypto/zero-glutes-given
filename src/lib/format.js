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
};

export function priceLabel(level) {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)));
}

export function mapsUrl(r) {
  const q = encodeURIComponent(`${r.name} ${r.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
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
