'use strict';

const test = require('node:test');
const assert = require('node:assert');

const math = require('../src/renderer/viewer-math');
const { createWheel } = require('../src/renderer/wheel-input');

const port = { width: 800, height: 600 };
const photo = { width: 4000, height: 3000 };

test('fitting shrinks a large photo but never enlarges a small one', () => {
  assert.strictEqual(math.fitScale(photo, port), 0.2);
  assert.strictEqual(math.fitScale({ width: 400, height: 300 }, port), 1);
});

test('fitting the width starts at the top of a tall photo', () => {
  const view = math.modeView('width', { width: 1000, height: 3000 }, port);
  assert.strictEqual(view.scale, 0.8);
  assert.strictEqual(view.cy, (3000 * 0.8 - 600) / 2);
});

test('zooming keeps the point under the pointer in place', () => {
  const start = math.modeView('fit', photo, port);
  const point = { x: 600, y: 150 };
  const before = {
    x: (point.x - port.width / 2 - start.cx) / start.scale,
    y: (point.y - port.height / 2 - start.cy) / start.scale,
  };
  const view = math.zoomAt(start, 1, point, photo, port);
  const after = {
    x: (point.x - port.width / 2 - view.cx) / view.scale,
    y: (point.y - port.height / 2 - view.cy) / view.scale,
  };
  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);
});

test('a photo cannot be dragged past its edges or off centre when it fits', () => {
  const zoomed = math.pan({ scale: 1, cx: 0, cy: 0 }, 99999, -99999, photo, port);
  assert.strictEqual(zoomed.cx, (4000 - 800) / 2);
  assert.strictEqual(zoomed.cy, -(3000 - 600) / 2);
  const fitted = math.pan(math.modeView('fit', photo, port), 50, 50, photo, port);
  assert.deepStrictEqual([fitted.cx, fitted.cy], [0, 0]);
});

test('zoom is bounded below by half the fit and above by the maximum', () => {
  const view = math.modeView('fit', photo, port);
  assert.strictEqual(math.zoomAt(view, 0.0001, { x: 400, y: 300 }, photo, port).scale, 0.1);
  assert.strictEqual(math.zoomAt(view, 999, { x: 400, y: 300 }, photo, port).scale, math.MAX_SCALE);
});

// Trackpad and mouse streams, as the mockup was checked with.
function feed(wheel, events, options, gap = 16, start = 1000) {
  let now = start;
  const out = [];
  for (const e of events) {
    out.push(wheel.interpret({ deltaMode: 0, deltaX: 0, deltaY: 0, ctrlKey: false, metaKey: false, ...e }, options, now));
    now += gap;
  }
  return out;
}

const fitted = { zoomed: false, wheel: 'nav' };

test('scrolling up and down on a trackpad leaves a fitted photo alone', () => {
  const out = feed(createWheel(), Array.from({ length: 10 }, () => ({ deltaY: 6.5 })), fitted);
  assert.ok(out.every((intent) => intent.type === 'none'));
  assert.strictEqual(out[0].kind, 'trackpad');
});

test('one swipe turns one page, momentum included', () => {
  const swipe = Array.from({ length: 25 }, (_, i) => ({ deltaX: 9 + (i < 10 ? 6 : -0.3 * i), deltaY: 0.4 }));
  const pages = feed(createWheel(), swipe, fitted).filter((intent) => intent.type === 'page');
  assert.deepStrictEqual(pages.map((p) => p.step), [1]);
});

test('a new swipe after a pause turns the next page', () => {
  const wheel = createWheel();
  const swipe = Array.from({ length: 8 }, () => ({ deltaX: -12 }));
  const first = feed(wheel, swipe, fitted).filter((intent) => intent.type === 'page');
  // The second swipe starts well after the first one's momentum has died.
  const later = feed(wheel, swipe, fitted, 16, 5000).filter((intent) => intent.type === 'page');
  assert.strictEqual(first.length, 1);
  assert.deepStrictEqual(later.map((p) => p.step), [-1]);
});

test('two fingers move a zoomed photo instead of turning pages', () => {
  const out = feed(createWheel(), [{ deltaX: 3.5, deltaY: 7.5 }], { zoomed: true, wheel: 'nav' });
  assert.deepStrictEqual(out[0], { type: 'pan', dx: -3.5, dy: -7.5, kind: 'trackpad' });
});

test('a pinch always zooms', () => {
  const out = feed(createWheel(), [{ deltaY: -12, ctrlKey: true }], fitted);
  assert.strictEqual(out[0].type, 'zoom');
  assert.ok(out[0].factor > 1);
});

test('a mouse wheel notch turns a page, and with ⌘ it zooms', () => {
  const wheel = createWheel();
  assert.deepStrictEqual(feed(wheel, [{ deltaY: 100 }], fitted)[0], { type: 'page', step: 1, kind: 'mouse' });
  assert.strictEqual(feed(wheel, [{ deltaY: -100, metaKey: true }], fitted, 16, 5000)[0].type, 'zoom');
});

test('the zoom option swaps the wheel and ⌘ + wheel', () => {
  const options = { zoomed: false, wheel: 'zoom' };
  assert.strictEqual(feed(createWheel(), [{ deltaY: 100 }], options)[0].type, 'zoom');
  assert.strictEqual(feed(createWheel(), [{ deltaY: 100, metaKey: true }], options)[0].type, 'page');
});
