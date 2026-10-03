import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Gluten Free Test Kitchen', 'gluten-free-test-kitchen'],
    ["Frankie & Jo's", 'frankie-jo-s'],
    ['  Extra   Spaces  ', 'extra-spaces'],
    ['Café Organique (Ballard)', 'cafe-organique-ballard'],
    ['Crème Brûlée Bakery', 'creme-brulee-bakery'],
  ])('%s -> %s', (name, id) => {
    expect(slugify(name)).toBe(id);
  });

  it('never leaves leading or trailing dashes', () => {
    expect(slugify('--- Hello ---')).toBe('hello');
  });

  it('caps length so an id stays a sane document key', () => {
    expect(slugify('a'.repeat(200)).length).toBe(60);
  });

  it('returns an empty string for a name with nothing usable', () => {
    // the Add-spot form treats an empty id as invalid, so this must stay ''
    expect(slugify('!!!')).toBe('');
  });
});
