'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { whereLine, shownName } = require('../src/renderer/folder-names');

const NAMES = { desktop: 'Desktop', onedrive: 'OneDrive', home: 'Home' };

function folder(overrides) {
  return { name: 'docs', source: 'desktop', place: 'Desktop', parents: [], trail: [], clash: null, ...overrides };
}

test('a short location is shown whole, down to the folder itself', () => {
  assert.strictEqual(whereLine(folder({ trail: ['project', 'docs'] }), NAMES), 'Desktop › project › docs');
  assert.strictEqual(whereLine(folder({ trail: ['docs'] }), NAMES), 'Desktop › docs');
  assert.strictEqual(whereLine(folder(), NAMES), 'Desktop');
});

test('a renamed folder still shows its real folder name', () => {
  const renamed = folder({ name: 'turink projects', trail: ['workspace', 'turink', 'projects'], source: 'home' });
  assert.strictEqual(whereLine(renamed, NAMES), 'Home › workspace › turink › projects');
});

test('a long location keeps its place and the four nearest folders', () => {
  assert.strictEqual(whereLine(folder({ trail: ['project', 'turink', 'labs', 'docs'] }), NAMES), 'Desktop › project › turink › labs › docs');
  const deep = folder({ trail: ['project', 'turink', 'labs', 'turink-toys', 'packages', 'docs'] });
  assert.strictEqual(whereLine(deep, NAMES), 'Desktop › … › labs › turink-toys › packages › docs');
});

test('a measured line can keep fewer folders, never fewer than the folder itself', () => {
  const deep = folder({ trail: ['project', 'turink', 'labs', 'docs'] });
  assert.strictEqual(whereLine(deep, NAMES, 4), 'Desktop › project › turink › labs › docs');
  assert.strictEqual(whereLine(deep, NAMES, 2), 'Desktop › … › labs › docs');
  assert.strictEqual(whereLine(deep, NAMES, 1), 'Desktop › … › docs');
  assert.strictEqual(whereLine(deep, NAMES, 0), 'Desktop › … › docs');
});

test('similar deep paths stay distinguishable', () => {
  const a = folder({ trail: ['work', 'clients', 'acme', '2025', 'reports', 'docs'] });
  const b = folder({ trail: ['work', 'clients', 'acme', '2026', 'reports', 'docs'] });
  assert.notStrictEqual(whereLine(a, NAMES), whereLine(b, NAMES));
});

test('an unnamed place falls back to its own name', () => {
  assert.strictEqual(whereLine(folder({ source: 'volume', place: 'Photos', trail: ['2026'] }), NAMES), 'Photos › 2026');
});

test('clashing names are told apart by place or by parent', () => {
  assert.strictEqual(shownName(folder(), NAMES), 'docs');
  assert.strictEqual(shownName(folder({ clash: 'place', source: 'onedrive' }), NAMES), 'docs (OneDrive)');
  assert.strictEqual(shownName(folder({ clash: 'parent', parents: ['ref'] }), NAMES), 'docs (ref)');
  assert.strictEqual(shownName(folder({ clash: 'parent', parents: [] }), NAMES), 'docs (Desktop)');
});
