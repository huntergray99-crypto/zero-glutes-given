import { useCloud } from './CloudContext';

// Whether the current account is entitled to premium features, for gating a
// single control (a map-layer button, a toggle) without the PaywallGate
// card's chrome.
export function usePremiumGate() {
  const { signedIn, isPremium } = useCloud();
  return { isPremium, locked: !isPremium, signedIn };
}
