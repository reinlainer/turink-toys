'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./temp');

const core = require('../src');
const store = require('../src/tasks/clipboard/store');

function memory() {
  const data = {};
  return { get: (key, fallback) => (data[key] === undefined ? fallback : data[key]), set: (key, value) => (data[key] = value) };
}

// A name in the helper's format for a moment `msAgo` before `now`.
function keptName(now, msAgo, hash) {
  const d = new Date(now - msAgo);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${hash}.png`;
}

test('the clipboard tasks are registered and collection is a preference', () => {
  for (const id of ['clipboard.list', 'clipboard.save', 'clipboard.copy', 'clipboard.collect']) {
    assert.ok(core.registry.has(id), id);
  }
  assert.strictEqual(core.registry.get('clipboard.collect').preference, true);
  assert.strictEqual(core.registry.get('clipboard.list').risk, 'read');
});

test('collection is off until it is turned on', () => {
  const storage = memory();
  assert.strictEqual(store.collecting(storage), false);
  store.setCollecting(true, storage);
  assert.strictEqual(store.collecting(storage), true);
  store.setCollecting(false, storage);
  assert.strictEqual(store.collecting(storage), false);
});

test('kept images are split at a day and listed newest first', async () => {
  const dir = tempDir('turink-clipboard-');
  const now = new Date(2026, 10, 17, 12, 0, 0).getTime();
  const hour = 60 * 60 * 1000;
  const names = {
    justNow: keptName(now, 60 * 1000, '000000000001'),
    morning: keptName(now, 5 * hour, '000000000002'),
    yesterday: keptName(now, 23 * hour, '000000000003'),
    lastWeek: keptName(now, 7 * 24 * hour, '000000000004'),
    dayAndAMinute: keptName(now, 24 * hour + 60 * 1000, '000000000005'),
  };
  for (const name of Object.values(names)) fs.writeFileSync(path.join(dir, name), 'png');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'not an image');
  fs.writeFileSync(path.join(dir, '.hidden.png'), 'hidden');

  const { recent, older } = await store.listKept(dir, now);
  assert.deepStrictEqual(recent.map((i) => i.name), [names.justNow, names.morning, names.yesterday]);
  assert.deepStrictEqual(older.map((i) => i.name), [names.dayAndAMinute, names.lastWeek]);
  assert.strictEqual(recent[0].type, 'photo');
  assert.strictEqual(recent[0].path, path.join(dir, names.justNow));
});

test('an image named by hand goes by its modification time', async () => {
  const dir = tempDir('turink-clipboard-');
  const file = path.join(dir, 'dropped in.png');
  fs.writeFileSync(file, 'png');
  const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  fs.utimesSync(file, old, old);
  const { recent, older } = await store.listKept(dir);
  assert.strictEqual(recent.length, 0);
  assert.strictEqual(older.length, 1);
});

test('a missing gallery folder lists nothing', async () => {
  const dir = path.join(tempDir('turink-clipboard-'), 'not-yet');
  assert.deepStrictEqual(await store.listKept(dir), { recent: [], older: [] });
});

test('only images inside the gallery folder are accepted', () => {
  const dir = tempDir('turink-clipboard-');
  const outside = tempDir('turink-clipboard-other-');
  const kept = path.join(dir, '20261117-120000-0123456789ab.png');
  fs.writeFileSync(kept, 'png');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'text');
  fs.writeFileSync(path.join(outside, 'a.png'), 'png');

  assert.deepStrictEqual(store.requireKept([kept], dir), [kept]);
  const code = (fn) => {
    try {
      fn();
      return null;
    } catch (err) {
      return err.code;
    }
  };
  assert.strictEqual(code(() => store.requireKept([path.join(outside, 'a.png')], dir)), 'NOT_KEPT');
  assert.strictEqual(code(() => store.requireKept([path.join(dir, 'notes.txt')], dir)), 'NOT_KEPT');
  assert.strictEqual(code(() => store.requireKept([path.join(dir, 'sub', '..', '..', path.basename(outside), 'a.png')], dir)), 'NOT_KEPT');
  assert.strictEqual(code(() => store.requireKept([path.join(dir, '20261117-120001-0123456789ac.png')], dir)), 'SRC_NOT_FOUND');
});
