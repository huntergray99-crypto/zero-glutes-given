// Cheesy proximity one-liners. Keep it fun; keep it safe (never imply a spot is
// risk-free — the app's job is to point, the eater's job is to confirm).

const LINES = [
  (n, d) =>
    `You're ${d} from ${n}. Turn the corner, take a few steps, and fulfill your tastebuds' wishes. 🌯`,
  (n, d, w) =>
    `${n} is ${d} away — about a ${w}-minute walk. Your gut says go. (And for once, it's allowed to.) ✨`,
  (n, d) => `Psst… ${n}, just ${d} out. Gluten-free glory, right there. 👀`,
  (n, d) => `${d} to ${n}. The crumbs of destiny are calling. 🥐`,
  (n, d, w) =>
    `Plot twist: ${n} is only ${d} from you. A ${w}-minute stroll to snack enlightenment. 🎉`,
  (n, d) => `Warning: ${n} is within ${d}. Deliciousness imminent. 🚨`,
];

export function nudgeLine(name, distStr, walkMin) {
  const fn = LINES[Math.floor(Math.random() * LINES.length)];
  return fn(name, distStr, walkMin);
}
