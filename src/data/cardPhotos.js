// Card photography for the browse rails. Priority per spot:
//   1. spotPhotos.js  — a real photo of that restaurant (scripts/fetch-photos.mjs)
//   2. RESTAURANT_PHOTOS below — manual override
//   3. a representative dish photo for the spot's primary cuisine (Wikimedia
//      Commons, via the stable Special:FilePath redirect)
//   4. a cuisine emoji, if even the image fails to load

import { SPOT_PHOTOS } from './spotPhotos';

const commons = (file, width = 640) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    file
  )}?width=${width}`;

// One representative photo per cuisine tag we use.
const CUISINE_PHOTO = {
  Pizza: commons('Whole Foods Kitchen Margherita Pizza 1 (15411931201).jpg'),
  Italian: commons('Whole Foods Kitchen Margherita Pizza 1 (15411931201).jpg'),
  Mexican: commons('Al pastor tacos (34320411213).jpg'),
  'Bakery & Sweets': commons('20231022 101836 Croissant suprême.jpg'),
  Seafood: commons('Nigiri assortment.jpg'),
  Asian: commons('Thai Green Curry with Rice.jpg'),
  Hawaiian: commons('Nigiri assortment.jpg'),
  'Bars & Breweries': commons('Poutine.JPG'),
  American: commons('Bacon Cheeseburger with French Fries on plate.JPG'),
  BBQ: commons('Bacon Cheeseburger with French Fries on plate.JPG'),
  'Bowls & Salads': commons('Healthy Lentil Salad (Unsplash).jpg'),
  'Vegan & Veggie': commons('Healthy Lentil Salad (Unsplash).jpg'),
  Brunch: commons('Bacon Cheeseburger with French Fries on plate.JPG'),
  Mediterranean: commons('Healthy Lentil Salad (Unsplash).jpg'),
};

// Cuisine → emoji, for the fallback tile when there's no photo.
const CUISINE_EMOJI = {
  Pizza: '🍕',
  Italian: '🍝',
  Mexican: '🌮',
  'Bakery & Sweets': '🥐',
  Seafood: '🦪',
  Asian: '🍜',
  Hawaiian: '🍍',
  'Bars & Breweries': '🍺',
  American: '🍔',
  BBQ: '🍖',
  'Bowls & Salads': '🥗',
  'Vegan & Veggie': '🥬',
  Brunch: '🍳',
  Mediterranean: '🫒',
};

// Per-restaurant overrides — add real photos here as we get them.
export const RESTAURANT_PHOTOS = {};

function firstMatch(cuisines, table) {
  for (const c of cuisines) if (table[c]) return table[c];
  return null;
}

// Local /spots/*.webp files need the Vite base prefix (/zero-glutes-given/ on
// GitHub Pages); external https URLs pass through untouched.
function resolveAsset(p) {
  if (/^https?:/.test(p)) return p;
  return import.meta.env.BASE_URL + p.replace(/^\/+/, '');
}

export function photoFor(r) {
  if (SPOT_PHOTOS[r.id]?.file) return resolveAsset(SPOT_PHOTOS[r.id].file);
  if (RESTAURANT_PHOTOS[r.id]) return resolveAsset(RESTAURANT_PHOTOS[r.id]);
  return firstMatch(r.cuisine || [], CUISINE_PHOTO);
}

// Attribution for a spot's real photo, when it has one ({ credit, yelpUrl }).
export function photoCredit(r) {
  return SPOT_PHOTOS[r.id]?.file ? SPOT_PHOTOS[r.id] : null;
}

export function cuisineEmoji(cuisines = []) {
  return firstMatch(cuisines, CUISINE_EMOJI) || '🍽️';
}
