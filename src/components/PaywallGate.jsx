import { useState } from 'react';
import { useCloud } from '../lib/CloudContext';
import { startCheckout, stripeConfigured } from '../lib/stripe';

// Wraps a premium feature. Renders `children` when entitled; otherwise a
// compact, scannable lock card with the pitch and an upgrade CTA.
//
// Checkout redirects to Stripe (see stripe.js) when a payment link is
// configured; otherwise falls back to a "coming soon" state, so this stays
// fully functional and demoable even before Stripe is set up. Either way,
// clicking Upgrade never flips isPremium itself — that only ever happens
// from a privileged write (admin or webhook), never the browser granting
// itself access.
export default function PaywallGate({
  feature,
  pitch,
  onUpgradeClick,
  compact = false,
  children,
}) {
  const { signedIn, isPremium, user } = useCloud();
  const [showComingSoon, setShowComingSoon] = useState(false);

  if (isPremium) return children;

  function handleUpgrade() {
    if (onUpgradeClick) return onUpgradeClick();
    if (signedIn && stripeConfigured()) {
      startCheckout({ uid: user.uid, email: user.email });
      return;
    }
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 4000);
  }

  return (
    <div className={`paywall-gate ${compact ? 'paywall-gate-compact' : ''}`}>
      <div className="paywall-gate-body">
        <span className="paywall-lock" aria-hidden>
          🔒
        </span>
        <div>
          <b>{feature}</b>
          {pitch ? <p className="muted">{pitch}</p> : null}
        </div>
      </div>
      <button className="btn paywall-cta" onClick={handleUpgrade}>
        {signedIn ? 'Upgrade' : 'Sign in to upgrade'}
      </button>
      {showComingSoon ? (
        <p className="rf-note">
          {signedIn
            ? 'Premium isn’t open yet — check back soon.'
            : 'Sign in above first, then come back here to upgrade.'}
        </p>
      ) : null}
    </div>
  );
}
