import { describe, it, expect } from 'vitest';
import {
  deliveryLinks,
  pickupOnly,
  orderDirect,
  doordashSearch,
  uberEatsSearch,
} from './order';

const suburb = {
  id: 'not-in-the-verified-table',
  name: "Joe's Grill",
  neighborhood: 'Bellevue',
  address: '123 Main St, Bellevue, WA 98004',
};

describe('delivery search links', () => {
  it('searches by the restaurant’s own city, not the market default', () => {
    // The live bug this guards: every search used to append "Seattle", so a
    // Bellevue spot searched as "… Bellevue Seattle" and found nothing.
    const url = doordashSearch(suburb);
    expect(url).toBe("https://www.doordash.com/search/store/Joe's%20Grill%20Bellevue%20WA");
    expect(url).not.toContain('Seattle');
  });

  it('keeps the neighborhood when it differs from the city', () => {
    const fremont = {
      id: 'x',
      name: 'Tacos',
      neighborhood: 'Fremont',
      address: '1 A St, Seattle, WA 98103',
    };
    expect(uberEatsSearch(fremont)).toBe(
      'https://www.ubereats.com/search?q=Tacos%20Fremont%20Seattle%20WA'
    );
  });

  it('still produces a sane query when the address is missing', () => {
    const url = doordashSearch({ id: 'x', name: 'Nameless Diner', neighborhood: 'Ballard' });
    expect(url).toContain('Nameless%20Diner');
  });
});

describe('deliveryLinks', () => {
  it('offers only the apps a spot is verified on, with deep links', () => {
    const links = deliveryLinks({ id: 'the-angry-beaver', name: 'The Angry Beaver' });
    expect(links.map((l) => l.key)).toEqual(['doordash', 'grubhub']);
    expect(links.every((l) => l.url.includes('/store/') || l.url.includes('/restaurant/'))).toBe(
      true
    );
  });

  it('falls back to a search link where an app is listed without a deep link', () => {
    const links = deliveryLinks({
      id: 'ghostfish-brewing',
      name: 'Ghostfish',
      neighborhood: 'SODO',
      address: '1 A St, Seattle, WA 98134',
    });
    expect(links.map((l) => l.key)).toEqual(['doordash', 'grubhub', 'ubereats']);
    expect(links[0].url).toContain('/store/ghostfish-brewing-company-seattle-915642');
    expect(links[1].url).toContain('grubhub.com/search');
    expect(links[2].url).toContain('ubereats.com/search');
  });

  it('offers all three apps for a spot nobody has verified yet', () => {
    const links = deliveryLinks(suburb);
    expect(links.map((l) => l.label)).toEqual(['DoorDash', 'Grubhub', 'Uber Eats']);
  });

  it('offers nothing for a spot known to be off the apps', () => {
    const r = { id: 'theary-cambodian-foods-federal-way', name: 'Theary' };
    expect(deliveryLinks(r)).toEqual([]);
    expect(pickupOnly(r)).toBe(true);
  });

  it('does not call an unverified spot pickup-only', () => {
    expect(pickupOnly(suburb)).toBe(false);
  });
});

describe('orderDirect', () => {
  it('returns the spot’s own ordering link, or null', () => {
    expect(orderDirect({ id: 'the-angry-beaver' }).platform).toBe('Toast');
    expect(orderDirect({ id: 'unknown' })).toBeNull();
  });
});
