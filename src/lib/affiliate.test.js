import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TEMPLATES is read at module load, so each case sets the env, resets the
// module cache, and imports fresh.
async function load(env) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./affiliate');
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe('affiliate', () => {
  const dest = 'https://www.doordash.com/search/store/Joe%20Seattle';

  it('returns the raw URL when no program is configured', async () => {
    const { affiliate, affiliateActive } = await load({ VITE_AFFIL_DOORDASH: '' });
    expect(affiliate('doordash', dest)).toBe(dest);
    expect(affiliateActive('doordash')).toBe(false);
  });

  it('wraps the destination in the tracking link, encoded', async () => {
    const { affiliate, affiliateActive } = await load({
      VITE_AFFIL_DOORDASH: 'https://doordash.pxf.io/c/1/2/3?u={u}',
    });
    expect(affiliate('doordash', dest)).toBe(
      `https://doordash.pxf.io/c/1/2/3?u=${encodeURIComponent(dest)}`
    );
    expect(affiliateActive('doordash')).toBe(true);
  });

  it('ignores a template missing the {u} token rather than emitting a broken link', async () => {
    const { affiliate, affiliateActive } = await load({
      VITE_AFFIL_DOORDASH: 'https://doordash.pxf.io/c/1/2/3',
    });
    expect(affiliate('doordash', dest)).toBe(dest);
    expect(affiliateActive('doordash')).toBe(false);
  });

  it('only wraps the network that is configured', async () => {
    const { affiliate } = await load({
      VITE_AFFIL_DOORDASH: 'https://doordash.pxf.io/c/1/2/3?u={u}',
      VITE_AFFIL_UBEREATS: '',
    });
    const uber = 'https://www.ubereats.com/search?q=x';
    expect(affiliate('ubereats', uber)).toBe(uber);
  });
});
