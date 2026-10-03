import { useCloud } from './CloudContext';
import { stripeConfigured } from './stripe';

// Whether the current account is entitled to premium features, for gating a
// single control (a map-layer button, a toggle) without the PaywallGate
// card's chrome.
//
// `offered` is whether premium should be *visible* at all. A locked layer and
// an Upgrade button that can only say "check back soon" is a dead end — and in
// an app-store build it reads as an unfinished paywall, which is a review risk
// (Google and Apple both police how digital unlocks are sold). So premium UI
// only appears once there's a real way to buy it, or for someone who already
// has it (e.g. comped from the admin panel) and should keep what they have.
export function usePremiumGate() {
  const { signedIn, isPremium } = useCloud();
  return {
    isPremium,
    locked: !isPremium,
    signedIn,
    offered: isPremium || stripeConfigured(),
  };
}
