import { describe, it, expect } from 'vitest';
import { cleanOverride, auditOf, OVERRIDABLE } from './overrides';

describe('cleanOverride', () => {
  it('keeps whitelisted fields and drops everything else', () => {
    const out = cleanOverride({
      closed: true,
      safetyLevel: 'dedicated',
      isAdmin: true, // not a restaurant field — must never reach the record
      evil: '<script>',
      updatedBy: 'someone', // audit bookkeeping, not data
    });
    expect(out).toEqual({ closed: true, safetyLevel: 'dedicated' });
  });

  it('keeps falsy values that are real answers', () => {
    // "closed: false" and "dedicatedFryer: false" are statements, not absence
    const out = cleanOverride({ closed: false, dedicatedFryer: false, priceLevel: 0 });
    expect(out).toEqual({ closed: false, dedicatedFryer: false, priceLevel: 0 });
  });

  it('skips fields that are undefined', () => {
    expect(cleanOverride({ closed: undefined })).toEqual({});
  });

  it('returns an empty object for an empty doc', () => {
    expect(cleanOverride({})).toEqual({});
  });

  it('whitelists the fields a new-spot publish writes', () => {
    for (const k of ['name', 'lat', 'lng', 'safetyLevel', 'celiacVerified']) {
      expect(OVERRIDABLE).toContain(k);
    }
  });
});

describe('auditOf', () => {
  it('returns only bookkeeping fields', () => {
    const out = auditOf({ closed: true, note: 'confirmed by phone', updatedBy: 'u1' });
    expect(out).toEqual({ note: 'confirmed by phone', updatedBy: 'u1' });
  });

  it('turns a Firestore timestamp into an ISO string', () => {
    const when = new Date('2026-09-01T12:00:00Z');
    const out = auditOf({ updatedAt: { toDate: () => when } });
    expect(out.updatedAt).toBe('2026-09-01T12:00:00.000Z');
  });
});
