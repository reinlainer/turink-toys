'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { whereLine, shownName } = require('../src/renderer/folder-names');

const NAMES = { desktop: 'Desktop', onedrive: 'OneDrive', home: 'Home' };

function folder(overrides) {
  return { name: 'docs', source: 'desktop', place: 'Desktop', parents: [], clash: null, ...overrides };
}

test('a short location is shown whole', () => {
  assert.strictEqual(whereLine(folder({ parents: ['project'] }), NAMES), 'Desktop › project');
  assert.strictEqual(whereLine(folder({ parents: ['a', 'b'] }), NAMES), 'Desktop › a › b');
  assert.strictEqual(whereLine(folder(), NAMES), 'Desktop');
});

test('a long location keeps its place and the three nearest folders', () => {
  assert.strictEqual(whereLine(folder({ parents: ['project', 'turink', 'labs'] }), NAMES), 'Desktop › project › turink › labs');
  const deep = folder({ parents: ['project', 'turink', 'labs', 'turink-toys', 'packages'] });
  assert.strictEqual(whereLine(deep, NAMES), 'Desktop › … › labs › turink-toys › packages');
});

test('similar deep paths stay distinguishable', () => {
  const a = folder({ parents: ['work', 'clients', 'acme', '2025', 'reports'] });
  const b = folder({ parents: ['work', 'clients', 'acme', '2026', 'reports'] });
  assert.notStrictEqual(whereLine(a, NAMES), whereLine(b, NAMES));
});

test('an unnamed place falls back to its own name', () => {
  assert.strictEqual(whereLine(folder({ source: 'volume', place: 'Photos', parents: ['2026'] }), NAMES), 'Photos › 2026');
});

test('clashing names are told apart by place or by parent', () => {
  assert.strictEqual(shownName(folder(), NAMES), 'docs');
  assert.strictEqual(shownName(folder({ clash: 'place', source: 'onedrive' }), NAMES), 'docs (OneDrive)');
  assert.strictEqual(shownName(folder({ clash: 'parent', parents: ['ref'] }), NAMES), 'docs (ref)');
  assert.strictEqual(shownName(folder({ clash: 'parent', parents: [] }), NAMES), 'docs (Desktop)');
});
