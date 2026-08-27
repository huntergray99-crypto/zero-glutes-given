# Zero Glutes Given

**Celiac-safe dining in Seattle** — a map of gluten-free and celiac-safe restaurants
with safety levels, dedicated-fryer info, and per-device celiac reviews.

## Stack

Chosen for "free and easiest to host":

- **Vite + React** single-page app — builds to static files
- **Leaflet + OpenStreetMap** tiles for the map (no API key, no billing)
- **localStorage** for reviews (no backend, no accounts) — reviews live only in the
  browser that wrote them
- Deployable free to GitHub Pages, Netlify, Cloudflare Pages, or Vercel

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the build locally
```

## Data

`src/data/restaurants.js` is a hand-curated seed list compiled from the Seattle
celiac community, Find Me Gluten Free reports, and restaurants' own allergen info.

Each entry has a `safetyLevel`:

| level | meaning |
| --- | --- |
| `dedicated` | 100% gluten-free facility, no gluten on premises |
| `celiac-friendly` | gluten in the kitchen, documented separate-prep protocols + trained staff |
| `gf-menu` | marked GF options, shared kitchen — ask about protocols |

Plus `dedicatedFryer`, `celiacVerified`, `priceLevel`, `cuisine[]`, coordinates,
`whatToOrder`, and `lastVerified`.

**This is a starting point, not a medical guarantee.** Protocols, menus, and
ownership change — always confirm your needs directly with the restaurant.

## MVP feature set

- [x] Interactive Seattle map with color-coded pins + synced list
- [x] Filters: safety level, dedicated fryer, celiac-verified, max price, cuisine
- [x] Search by name / neighborhood / cuisine
- [x] Restaurant detail panel (address, directions, safety facts, what to order)
- [x] Celiac reviews with a "got glutened here" flag (per-device, localStorage)
- [x] Responsive — list/map toggle on mobile

## Not yet decided / next steps

- **Real data pipeline** — user submissions, or a moderated Google Sheet / CMS, or
  partnering with a celiac org for verification
- **Shared reviews** — needs a backend (Supabase / Firebase free tiers fit the budget)
- **PWA install** — add a manifest + service worker
- **Verify seed coordinates and details** — several are approximate
- **Domain / social handles** — not yet checked
