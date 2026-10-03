import { describe, it, expect } from 'vitest';
import { corroboration, isUrgent } from './reports';

const report = (over) => ({
  restaurantId: 'spot-a',
  type: 'closed',
  status: 'open',
  uid: 'u1',
  ...over,
});

describe('corroboration', () => {
  it('counts distinct reporters on the same spot and type', () => {
    const counts = corroboration([
      report({ uid: 'u1' }),
      report({ uid: 'u2' }),
      report({ uid: 'u3' }),
    ]);
    expect(counts['spot-a|closed']).toBe(3);
  });

  it('does not let one account corroborate itself', () => {
    // The bug this guards: one person filing "closed" twice used to read as
    // two people agreeing, which is what unlocks the one-click fix.
    const counts = corroboration([
      report({ uid: 'u1' }),
      report({ uid: 'u1' }),
      report({ uid: 'u1' }),
    ]);
    expect(counts['spot-a|closed']).toBe(1);
  });

  it('treats every signed-out report as one anonymous voice', () => {
    // Can't tell anonymous reporters apart, so they must not stack up.
    const counts = corroboration([
      report({ uid: null }),
      report({ uid: null }),
      report({ uid: null }),
    ]);
    expect(counts['spot-a|closed']).toBe(1);
  });

  it('counts anonymous plus a signed-in reporter as two voices', () => {
    const counts = corroboration([report({ uid: null }), report({ uid: 'u9' })]);
    expect(counts['spot-a|closed']).toBe(2);
  });

  it('keeps different types and different spots separate', () => {
    const counts = corroboration([
      report({ uid: 'u1', type: 'closed' }),
      report({ uid: 'u2', type: 'hours' }),
      report({ uid: 'u3', restaurantId: 'spot-b' }),
    ]);
    expect(counts['spot-a|closed']).toBe(1);
    expect(counts['spot-a|hours']).toBe(1);
    expect(counts['spot-b|closed']).toBe(1);
  });

  it('ignores resolved reports and ones not tied to a spot', () => {
    const counts = corroboration([
      report({ uid: 'u1', status: 'resolved' }),
      report({ uid: 'u2', restaurantId: null, type: 'new-spot' }),
    ]);
    expect(counts).toEqual({});
  });
});

describe('isUrgent', () => {
  it('flags only open safety reports', () => {
    expect(isUrgent({ type: 'safety', status: 'open' })).toBe(true);
    expect(isUrgent({ type: 'safety', status: 'resolved' })).toBe(false);
    expect(isUrgent({ type: 'closed', status: 'open' })).toBe(false);
  });
});
