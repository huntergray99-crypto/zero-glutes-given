// Push a ping to a private Discord channel the moment someone files a report —
// so triage is "check your phone" instead of "remember to open the admin
// panel." Zero infrastructure: a Discord webhook is a URL you POST JSON to,
// no server, no Blaze plan, no Cloud Function.
//
// Trade-off, on purpose: this URL ships in the client bundle, like every
// other VITE_ var in this repo (see .env.example). A leaked webhook can only
// post spam into one private channel — regenerate it from Discord's channel
// settings in ten seconds if that ever happens. Acceptable risk for a free,
// no-backend alert. The hardened version — a Cloud Function triggered on the
// `reports` write, so the URL never reaches the browser — is a drop-in
// upgrade once this app is on the Blaze plan; see OPERATIONS.md.

const WEBHOOK = import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';

const LABEL = {
  closed: '🚫 Permanently closed',
  moved: '📍 Moved / wrong address',
  safety: '🚨 SAFETY INFO WRONG',
  hours: '🕐 Hours wrong',
  'new-spot': '➕ New spot suggested',
  other: '📝 Report',
};

export function alertsConfigured() {
  return !!WEBHOOK;
}

// Fire-and-forget: a dead or unconfigured webhook must never block or fail a
// report submission — the report itself already saved to Firestore, and the
// admin panel is still the source of truth. This is a convenience ping only.
export function notifyReport({ type, restaurantName, text, handle }) {
  if (!WEBHOOK) return;
  const label = LABEL[type] || LABEL.other;
  const who = handle ? `@${handle}` : 'an anonymous user';
  const where = restaurantName || 'an unnamed spot';
  const content = `${label} — **${where}**, from ${who}${
    text ? `\n> ${text.slice(0, 500)}` : ''
  }`;
  fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).catch(() => {});
}
