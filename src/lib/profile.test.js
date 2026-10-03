import { describe, it, expect, vi } from 'vitest';

// computeStats reads the restaurant list and reviews; both are stubbed so
// these tests control exactly which spots exist and which are featured.
vi.mock('./restaurantStore', () => ({
  getAllRestaurants: () => [
    { id: 'plain', name: 'Plain Spot', neighborhood: 'Ballard', featured: false },
    { id: 'star', name: 'Star Spot', neighborhood: 'Fremont', featured: true },
  ],
}));
vi.mock('./reviews', () => ({ getReviews: () => [] }));

import { checkInStatus, computeStats, CHECKIN_COOLDOWN_MS, POINTS } from './profile';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).toISOString();

describe('checkInStatus', () => {
  it('allows the first check-in at a spot', () => {
    expect(checkInStatus([], 1000)).toEqual({ allowed: true, nextAllowedAt: null });
    expect(checkInStatus(undefined, 1000).allowed).toBe(true);
  });

  it('blocks a second check-in inside 24 hours', () => {
    const last = new Date(2026, 5, 1, 12).getTime();
    const status = checkInStatus([{ date: new Date(last).toISOString() }], last + 3600_000);
    expect(status.allowed).toBe(false);
    expect(status.nextAllowedAt).toBe(last + CHECKIN_COOLDOWN_MS);
  });

  it('allows it again once the cooldown has passed', () => {
    const last = new Date(2026, 5, 1, 12).getTime();
    const status = checkInStatus(
      [{ date: new Date(last).toISOString() }],
      last + CHECKIN_COOLDOWN_MS
    );
    expect(status.allowed).toBe(true);
  });

  it('measures from the most recent visit, not the first', () => {
    const first = new Date(2026, 5, 1, 12).getTime();
    const second = first + 3 * CHECKIN_COOLDOWN_MS;
    const status = checkInStatus(
      [{ date: new Date(first).toISOString() }, { date: new Date(second).toISOString() }],
      second + 1000
    );
    expect(status.allowed).toBe(false);
  });
});

describe('computeStats', () => {
  it('is all zeros for no activity', () => {
    const s = computeStats({});
    expect(s.points).toBe(0);
    expect(s.totalCheckIns).toBe(0);
    expect(s.uniqueSpots).toBe(0);
    expect(s.level.min).toBe(0);
  });

  it('scores a first check-in as visit + discovery', () => {
    const s = computeStats({ checkIns: { plain: [{ date: at(2026, 6, 1), verified: false }] } });
    expect(s.points).toBe(POINTS.checkIn + POINTS.discovery);
    expect(s.verifiedCheckIns).toBe(0);
  });

  it('pays more for a GPS-verified check-in and counts it', () => {
    const s = computeStats({ checkIns: { plain: [{ date: at(2026, 6, 1), verified: true }] } });
    expect(s.points).toBe(POINTS.verifiedCheckIn + POINTS.discovery);
    expect(s.verifiedCheckIns).toBe(1);
  });

  it('gives the discovery bonus once per spot, not per visit', () => {
    const s = computeStats({
      checkIns: {
        plain: [
          { date: at(2026, 6, 1), verified: false },
          { date: at(2026, 6, 3), verified: false },
        ],
      },
    });
    expect(s.points).toBe(POINTS.checkIn * 2 + POINTS.discovery);
    expect(s.totalCheckIns).toBe(2);
    expect(s.uniqueSpots).toBe(1);
  });

  it('adds the featured bonus per visit to a featured spot', () => {
    const s = computeStats({ checkIns: { star: [{ date: at(2026, 6, 1), verified: false }] } });
    expect(s.points).toBe(POINTS.checkIn + POINTS.discovery + POINTS.featuredBonus);
    expect(s.featuredVisited).toBe(1);
  });

  it('flags a late-night check-in', () => {
    const late = computeStats({ checkIns: { plain: [{ date: at(2026, 6, 1, 23) }] } });
    const lunch = computeStats({ checkIns: { plain: [{ date: at(2026, 6, 1, 12) }] } });
    expect(late.lateCheckIn).toBe(true);
    expect(lunch.lateCheckIn).toBe(false);
  });

  it('adds points for posts', () => {
    expect(computeStats({ posts: 3 }).points).toBe(3 * POINTS.post);
  });

  it('survives an emptied visit list instead of crashing', () => {
    // Regression: undoing the only check-in once left `visits: []`, and the
    // old code read list.at(-1).date off it and threw.
    const s = computeStats({ checkIns: { plain: [] } });
    expect(s.totalCheckIns).toBe(0);
    expect(s.punchCard).toEqual([]);
  });

  it('ignores check-ins at spots that no longer exist', () => {
    const s = computeStats({ checkIns: { 'long-gone': [{ date: at(2026, 6, 1) }] } });
    expect(s.totalCheckIns).toBe(0);
  });

  it('counts distinct neighborhoods', () => {
    const s = computeStats({
      checkIns: {
        plain: [{ date: at(2026, 6, 1) }],
        star: [{ date: at(2026, 6, 1) }],
      },
    });
    expect(s.neighborhoods).toBe(2);
  });
});
