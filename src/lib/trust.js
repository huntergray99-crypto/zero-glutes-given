// Community trust scoring — a transparent, reproducible signal for how much
// weight to give one account's report, used to help an admin triage faster
// and to flag which corroborated reports are worth a one-click fix.
//
// Built entirely from the users/{uid} card that already powers the
// leaderboard (public read, no rules change needed) — never from another
// person's private check-in history, so an admin reviewing someone else's
// report doesn't need any new access to compute this.
//
// This is a SIGNAL, not a security boundary, and deliberately stays that
// way: it is client-computed from client-reported activity, so it can be
// gamed by someone patient enough to grind fake check-ins. Nothing here
// should ever be wired to bypass isAdmin() on a write — see AdminPanel's
// "quick-apply" button, which uses this to *suggest* a fix, never to *apply*
// one without a human clicking. A real trust system that resists targeted
// gaming needs server-side signals (account age from Auth, IP/device
// diversity across corroborating reports) that only a Cloud Function can
// see — tracked as a Blaze-gated follow-up, not faked here.

export const TRUST_TIERS = [
  { min: 60, name: 'Trusted', badge: '🛡️' },
  { min: 25, name: 'Established', badge: '✓' },
  { min: 0, name: 'New', badge: null },
];

// `card` is a users/{uid} doc as synced by cloud.js's syncUserCard.
export function trustScore(card) {
  if (!card) return 0;
  const verified = card.verifiedCheckIns || 0;
  const total = card.checkIns || 0;
  const spots = card.spots || 0;
  const reviews = card.reviews || 0;
  const badges = card.badges || 0;

  // A GPS-verified visit is the strongest anti-fraud signal available today
  // — someone provably standing in N different celiac-safe spots is a much
  // stronger source for "this place closed" than an anonymous claim.
  let score = verified * 8 + Math.max(0, total - verified) * 2;
  // Breadth over repetition: 10 visits to 10 different spots says more
  // about someone's reliability than 10 visits to 1.
  score += spots * 3;
  score += reviews * 4;
  score += badges * 5;

  return Math.min(100, Math.round(score));
}

export function trustTier(score) {
  return TRUST_TIERS.find((t) => score >= t.min) ?? TRUST_TIERS.at(-1);
}
