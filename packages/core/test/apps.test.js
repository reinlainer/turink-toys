'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { findLeftovers } = require('../src/tasks/apps/bundles');
const { assertAppBundle } = require('../src/kernel/paths');

function library(entries) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'turink-apps-'));
  for (const entry of entries) {
    const full = path.join(root, entry);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (/\.(plist|binarycookies)$/.test(entry)) fs.writeFileSync(full, 'x');
    else fs.mkdirSync(full, { recursive: true });
  }
  return root;
}

function app(overrides) {
  return {
    name: 'Example',
    bundleId: 'com.example.app',
    names: ['Example', 'ExampleHelper'],
    path: '/Applications/Example.app',
    ...overrides,
  };
}

function found(list, root) {
  return Object.fromEntries(list.map((item) => [path.relative(root, item.path), item.basis]));
}

test('leftovers are matched by identifier, by sub-identifier and by name', () => {
  const root = library([
    'Application Support/com.example.app',
    'Application Support/com.example.app.installer',
    'Application Support/Example',
    'Caches/com.example.app',
    'Preferences/com.example.app.plist',
    'Preferences/ByHost/com.example.app.0A1B2C3D-0000-1111-2222-333344445555.plist',
    'Saved Application State/com.example.app.savedState',
    'HTTPStorages/com.example.app.binarycookies',
    'Caches/com.example.application',
    'Preferences/com.other.app.plist',
  ]);
  const target = app();
  const result = found(findLeftovers(target, [target], root), root);

  assert.deepStrictEqual(result, {
    'Application Support/Example': 'name',
    'Application Support/com.example.app': 'bundle-id',
    'Application Support/com.example.app.installer': 'related',
    'Caches/com.example.app': 'bundle-id',
    'HTTPStorages/com.example.app.binarycookies': 'bundle-id',
    'Preferences/ByHost/com.example.app.0A1B2C3D-0000-1111-2222-333344445555.plist': 'bundle-id',
    'Preferences/com.example.app.plist': 'bundle-id',
    'Saved Application State/com.example.app.savedState': 'bundle-id',
  });
});

test('nothing owned by another installed application is claimed', () => {
  const root = library([
    'Caches/com.example.app',
    'Caches/com.example.app.beta',
    'Preferences/com.example.app.beta.plist',
    'Application Support/Shared',
  ]);
  const target = app({ names: ['Example', 'Shared'] });
  const beta = app({ bundleId: 'com.example.app.beta', names: ['Example Beta', 'Shared'], path: '/Applications/Beta.app' });
  const result = found(findLeftovers(target, [target, beta], root), root);

  assert.deepStrictEqual(result, { 'Caches/com.example.app': 'bundle-id' });
});

test('names are only matched in the folders that use them, and group containers are skipped', () => {
  const root = library(['Preferences/Example.plist', 'Containers/Example', 'Group Containers/ABCDE.com.example.app']);
  const target = app();
  assert.deepStrictEqual(findLeftovers(target, [target], root), []);
});

test('only application bundles inside an applications folder pass the bundle check', () => {
  const home = os.homedir();
  const appsDir = path.join(home, 'Applications');
  const made = !fs.existsSync(appsDir);
  const bundle = path.join(appsDir, `turink-test-${process.pid}.app`);
  fs.mkdirSync(bundle, { recursive: true });

  try {
    assert.strictEqual(assertAppBundle(bundle), bundle);
    assert.throws(() => assertAppBundle(appsDir), { code: 'OUTSIDE_HOME' });
    assert.throws(() => assertAppBundle('/Applications'), { code: 'OUTSIDE_HOME' });
    assert.throws(() => assertAppBundle('/System/Applications/Calculator.app'), { code: 'OUTSIDE_HOME' });
    assert.throws(() => assertAppBundle('/Applications/../Library/Example.app'), { code: 'OUTSIDE_HOME' });
    assert.throws(() => assertAppBundle(path.join(appsDir, 'missing.app')), { code: 'OUTSIDE_HOME' });
  } finally {
    fs.rmSync(bundle, { recursive: true, force: true });
    if (made) fs.rmSync(appsDir, { recursive: true, force: true });
  }
});
