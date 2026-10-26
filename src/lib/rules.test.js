import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { OWNED_COLLECTIONS } from './account';

// firestore.rules deploys separately from the client (`npm run rules:deploy`),
// so nothing else notices if someone tightens a rule and quietly breaks
// in-app account deletion — it would only surface as a store rejection, or a
// user stuck with data they can't remove. This pins that invariant to the file.
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

// One `match /<name>/{...}` block: from its match line up to the next one.
function block(name) {
  const start = rules.search(new RegExp(`match /${name}/\\{`));
  if (start < 0) return null;
  const next = rules.slice(start + 1).search(/\n\s*match \//);
  return next < 0 ? rules.slice(start) : rules.slice(start, start + 1 + next);
}

// Every `allow <methods>: if <condition>;` in a block.
function allows(text) {
  return [...text.matchAll(/allow\s+([a-z, ]+?):\s*if\s+([\s\S]*?);/g)].map((m) => ({
    methods: m[1].split(',').map((x) => x.trim()),
    cond: m[2].trim(),
  }));
}

// A bare `allow write` only counts if its condition never reads
// request.resource: a delete has none, so such a condition errors and Firestore
// denies it. That is exactly how users/{uid} silently refused deletion before
// the delete rule was split out.
const allowsDelete = (text) =>
  allows(text).some(
    (r) =>
      r.cond !== 'false' &&
      (r.methods.includes('delete') ||
        (r.methods.includes('write') && !r.cond.includes('request.resource')))
  );

describe('firestore.rules vs. account deletion', () => {
  it.each([...OWNED_COLLECTIONS, 'users'])('lets an owner delete their own %s', (name) => {
    const text = block(name);
    expect(text, `no match block for ${name}`).not.toBeNull();
    expect(allowsDelete(text), `${name} has no usable delete rule`).toBe(true);
  });

  it('keeps reports readable only by admins and the reporter themselves', () => {
    // Retraction needs a reporter to read their own — that must not widen into
    // anyone reading anyone's, which would expose names and handles.
    const read = allows(block('reports')).find((r) => r.methods.includes('read'));
    expect(read.cond).toBe(
      'isAdmin()\n        || (request.auth != null && resource.data.uid == request.auth.uid)'
    );
  });

  it('still keeps entitlements out of client hands', () => {
    // Deleting an account must never become a route to editing premium status.
    const write = allows(block('entitlements')).find((r) => r.methods.includes('write'));
    expect(write.cond).toBe('isAdmin()');
  });
});
