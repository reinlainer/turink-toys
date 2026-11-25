'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { pressIntent, span, Selection, rectFrom, hitsIn, edgeScroll } = require('../src/renderer/clip-selection');

const order = ['a', 'b', 'c', 'd', 'e', 'f'];
const picked = (sel) => sel.inOrder(order);

test('a press selects on its own only when nothing is selected yet', () => {
  const base = { selecting: false, selected: false, shift: false, onDot: false, repeat: false };
  assert.strictEqual(pressIntent(base), 'pick-on-click');
  assert.strictEqual(pressIntent({ ...base, selecting: true }), 'add-and-swipe');
  assert.strictEqual(pressIntent({ ...base, selecting: true, selected: true }), 'drop-on-click');
  assert.strictEqual(pressIntent({ ...base, shift: true }), 'range');
  assert.strictEqual(pressIntent({ ...base, onDot: true }), 'toggle');
});

test('the later presses of a double-click change nothing, except on the circle', () => {
  const base = { selecting: true, selected: false, shift: false, onDot: false, repeat: true };
  assert.strictEqual(pressIntent(base), 'none');
  assert.strictEqual(pressIntent({ ...base, shift: true }), 'none');
  assert.strictEqual(pressIntent({ ...base, onDot: true }), 'toggle');
});

test('clicks while selecting add and remove one image and never replace the rest', () => {
  const sel = new Selection();
  sel.pick('b');
  sel.toggle('d');
  sel.toggle('f');
  assert.deepStrictEqual(picked(sel), ['b', 'd', 'f']);
  sel.toggle('d');
  assert.deepStrictEqual(picked(sel), ['b', 'f']);
  assert.strictEqual(sel.focus, 'd');
});

test('a span runs either way and includes both ends', () => {
  assert.deepStrictEqual(span(order, 'b', 'd'), ['b', 'c', 'd']);
  assert.deepStrictEqual(span(order, 'e', 'c'), ['c', 'd', 'e']);
  assert.deepStrictEqual(span(order, 'gone', 'c'), ['c']);
  assert.deepStrictEqual(span(order, 'a', 'gone'), []);
});

test('Shift adds a range to the earlier picks and its end can move back', () => {
  const sel = new Selection();
  sel.pick('a');
  sel.toggle('c');
  sel.rangeTo('e', order);
  assert.deepStrictEqual(picked(sel), ['a', 'c', 'd', 'e']);
  sel.rangeTo('d', order);
  assert.deepStrictEqual(picked(sel), ['a', 'c', 'd']);
});

test('Shift without an anchor ranges from the focus', () => {
  const sel = new Selection();
  sel.focus = 'b';
  sel.rangeTo('d', order);
  assert.deepStrictEqual(picked(sel), ['b', 'c', 'd']);
});

test('a sweep adds the images between its start and the pointer, and shrinks back', () => {
  const sel = new Selection();
  sel.pick('a');
  sel.beginSweep('c', order);
  assert.deepStrictEqual(picked(sel), ['a', 'c']);
  sel.rangeTo('f', order);
  assert.deepStrictEqual(picked(sel), ['a', 'c', 'd', 'e', 'f']);
  sel.rangeTo('d', order);
  assert.deepStrictEqual(picked(sel), ['a', 'c', 'd']);
  sel.rangeTo('b', order);
  assert.deepStrictEqual(picked(sel), ['a', 'b', 'c']);
});

test('a rectangle replaces the selection or adds to it', () => {
  const sel = new Selection();
  sel.pick('a');
  const saved = sel.snapshot();
  sel.gather(['c', 'd'], []);
  assert.deepStrictEqual(picked(sel), ['c', 'd']);
  sel.gather(['c', 'd'], saved.selected);
  assert.deepStrictEqual(picked(sel), ['a', 'c', 'd']);
});

test('restoring a snapshot undoes the first click of a double-click', () => {
  const sel = new Selection();
  sel.pick('a');
  const saved = sel.snapshot();
  sel.toggle('b');
  sel.restore(saved);
  assert.deepStrictEqual(picked(sel), ['a']);
  saved.selected.add('f');
  assert.deepStrictEqual(picked(sel), ['a']);
});

test('clearing keeps the focus so the keys carry on from there', () => {
  const sel = new Selection();
  sel.toggle('c');
  sel.clear();
  assert.strictEqual(sel.size, 0);
  assert.strictEqual(sel.focus, 'c');
  assert.strictEqual(sel.anchor, null);
});

test('stepping stays inside the list and starts at the first image', () => {
  const sel = new Selection();
  assert.strictEqual(sel.stepFrom(1, order), 'a');
  sel.focus = 'e';
  assert.strictEqual(sel.stepFrom(4, order), 'f');
  assert.strictEqual(sel.stepFrom(-9, order), 'a');
  assert.strictEqual(sel.stepFrom(1, []), null);
});

test('images that left the folder leave the selection, focus and anchor', () => {
  const sel = new Selection();
  sel.pick('a');
  sel.toggle('b');
  sel.prune(new Set(['a', 'c']));
  assert.deepStrictEqual(picked(sel), ['a']);
  assert.strictEqual(sel.focus, null);
  assert.strictEqual(sel.anchor, null);
});

test('a rectangle hits the boxes it overlaps, drawn in any direction', () => {
  const boxes = [
    { path: 'a', left: 0, top: 0, right: 100, bottom: 80 },
    { path: 'b', left: 120, top: 0, right: 220, bottom: 80 },
    { path: 'c', left: 0, top: 100, right: 100, bottom: 180 },
  ];
  assert.deepStrictEqual(hitsIn(rectFrom({ x: 110, y: 90 }, { x: 115, y: 95 }), boxes), []);
  assert.deepStrictEqual(hitsIn(rectFrom({ x: 150, y: 50 }, { x: 50, y: 120 }), boxes), ['a', 'b', 'c']);
  assert.deepStrictEqual(hitsIn(rectFrom({ x: 100, y: 0 }, { x: 110, y: 10 }), boxes), ['a']);
});

test('dragging near an edge scrolls toward it, faster the closer it gets', () => {
  assert.strictEqual(edgeScroll(300, 0, 600), 0);
  assert.ok(edgeScroll(30, 0, 600) < 0);
  assert.ok(edgeScroll(5, 0, 600) < edgeScroll(30, 0, 600));
  assert.ok(edgeScroll(590, 0, 600) > 0);
  assert.strictEqual(edgeScroll(900, 0, 600), 24);
});
