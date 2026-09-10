// Card photography for the browse rails.
//
// We don't have a licensed photo of every restaurant's food yet (that needs a
// Places/Yelp image API or the user-uploaded photo feature). Until then these
// are representative dish photos from Wikimedia Commons, chosen by each spot's
// primary cuisine, served through the stable Special:FilePath redirect so we
// don't have to track upload hashes.
//
// To use a real photo for one spot, add an entry to RESTAURANT_PHOTOS keyed by
// its id — it wins over the cuisine default.

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

export function photoFor(r) {
  if (RESTAURANT_PHOTOS[r.id]) return RESTAURANT_PHOTOS[r.id];
  return firstMatch(r.cuisine || [], CUISINE_PHOTO);
}

export function cuisineEmoji(cuisines = []) {
  return firstMatch(cuisines, CUISINE_EMOJI) || '🍽️';
}
