import { useState } from 'react';
import { useCloud } from '../lib/CloudContext';

// Wraps a premium feature. Renders `children` when entitled; otherwise a
// compact, scannable lock card with the pitch and an upgrade CTA.
//
// No payment processor is wired up (see entitlements.js) — `onUpgradeClick`
// defaults to a "coming soon" state so the gate is fully functional and
// demoable today. Swap the default for a real checkout call when Stripe or
// RevenueCat is chosen; nothing else here changes.
export default function PaywallGate({
  feature,
  pitch,
  onUpgradeClick,
  compact = false,
  children,
}) {
  const { signedIn, isPremium } = useCloud();
  const [showComingSoon, setShowComingSoon] = useState(false);

  if (isPremium) return children;

  function handleUpgrade() {
    if (onUpgradeClick) return onUpgradeClick();
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
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
        <p className="rf-note">Premium isn’t open yet — check back soon.</p>
      ) : null}
    </div>
  );
}
