// Restaurant id from a name: "Café Organique (Ballard)" -> "cafe-organique-ballard".
// Accents are folded to their base letter first, so "Café" doesn't become
// "caf" — an id is never shown to users, but a mangled one is easy to collide.
export const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
