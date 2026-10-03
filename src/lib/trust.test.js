import { describe, it, expect } from 'vitest';
import { trustScore, trustTier } from './trust';

describe('trustScore', () => {
  it('is 0 for a missing card (a reporter we have no data on)', () => {
    expect(trustScore(null)).toBe(0);
    expect(trustScore(undefined)).toBe(0);
    expect(trustScore({})).toBe(0);
  });

  it('weights GPS-verified visits above unverified ones', () => {
    const verified = trustScore({ verifiedCheckIns: 3, checkIns: 3 });
    const unverified = trustScore({ verifiedCheckIns: 0, checkIns: 3 });
    expect(verified).toBe(24); // 3 * 8
    expect(unverified).toBe(6); // 3 * 2
  });

  it('adds breadth, reviews and badges on top of check-ins', () => {
    // verified 2*8 + other 3*2 + spots 3*3 + reviews 1*4 + badges 1*5
    expect(
      trustScore({ verifiedCheckIns: 2, checkIns: 5, spots: 3, reviews: 1, badges: 1 })
    ).toBe(40);
  });

  it('never goes negative when verified exceeds the total', () => {
    // a corrupt card: more "verified" than total check-ins
    expect(trustScore({ verifiedCheckIns: 3, checkIns: 1 })).toBe(24);
  });

  it('caps at 100 so a grinder cannot out-score everyone', () => {
    expect(trustScore({ verifiedCheckIns: 500, checkIns: 500 })).toBe(100);
  });
});

describe('trustTier', () => {
  it.each([
    [0, 'New', null],
    [24, 'New', null],
    [25, 'Established', '✓'],
    [59, 'Established', '✓'],
    [60, 'Trusted', '🛡️'],
    [100, 'Trusted', '🛡️'],
  ])('score %i is %s', (score, name, badge) => {
    const tier = trustTier(score);
    expect(tier.name).toBe(name);
    expect(tier.badge).toBe(badge);
  });

  it('falls back to New rather than throwing on a bad score', () => {
    expect(trustTier(-5).name).toBe('New');
  });
});
