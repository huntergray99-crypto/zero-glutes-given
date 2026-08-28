// Generates public/og-image.png (1200x630) for social link previews.
// Run: node scripts/make-og-image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og-image.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f1215"/>
      <stop offset="1" stop-color="#16241d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- mark -->
  <g transform="translate(96,150)">
    <circle cx="90" cy="90" r="90" fill="#1b7f4b"/>
    <g transform="translate(90,90) scale(5.2) translate(-16,-16)">
      <path d="M12 6v7a2 2 0 0 0 4 0V6M14 6v20M20.5 6c-1.6 1-2.2 3-2.2 6s.6 5 2.2 6V6z"
            stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="6.5" y1="25.5" x2="25.5" y2="6.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
    </g>
  </g>

  <text x="96" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" fill="#e7ebee">Zero Glutes Given</text>
  <text x="100" y="470" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="38" fill="#9aa5ac">Celiac-safe dining in Seattle</text>

  <g font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="26" fill="#9aa5ac">
    <circle cx="112" cy="540" r="9" fill="#1b7f4b"/><text x="132" y="549">Dedicated GF</text>
    <circle cx="330" cy="540" r="9" fill="#2f6fb0"/><text x="350" y="549">Celiac-friendly</text>
    <circle cx="576" cy="540" r="9" fill="#b07d2f"/><text x="596" y="549">GF menu</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('wrote', out);
