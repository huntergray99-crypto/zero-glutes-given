// Stripe checkout — a redirect to a Stripe-hosted Payment Link, no Stripe.js
// SDK and no server needed to *start* a purchase. The account's uid rides
// along as client_reference_id so whatever completes the purchase (a
// webhook, or an admin reading the Stripe dashboard) knows who to grant.
//
// What happens after payment is deliberately NOT wired to flip entitlement
// client-side — that would mean trusting the browser to grant itself
// premium, which is exactly the hole entitlements.js's rules are built to
// close. Marking someone premium has to happen from a privileged write
// (an admin, or a webhook using the Admin SDK). Until this app has real
// purchase volume, that's a human: Stripe's dashboard shows each payment's
// client_reference_id, and an admin grants it from the report queue's
// existing "Comp someone premium" tool — zero new infrastructure, works
// today. Wiring a real webhook (Cloud Functions on Blaze, or a small
// serverless function elsewhere) is the natural next step once volume
// justifies automating that click away.

const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || '';

export function stripeConfigured() {
  return !!PAYMENT_LINK;
}

// Sends the browser to Stripe's hosted checkout. Returns false (and does
// nothing) if no payment link is configured yet, so callers can fall back
// to a "coming soon" state instead of navigating to an empty string.
export function startCheckout({ uid, email } = {}) {
  if (!PAYMENT_LINK) return false;
  const url = new URL(PAYMENT_LINK);
  if (uid) url.searchParams.set('client_reference_id', uid);
  if (email) url.searchParams.set('prefilled_email', email);
  window.location.href = url.toString();
  return true;
}
