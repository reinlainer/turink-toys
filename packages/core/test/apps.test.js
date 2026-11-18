'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { tempDir } = require('./temp');

const { findLeftovers, cloudOwners, appGroups, vendorOf } = require('../src/tasks/apps/bundles');
const { assertAppBundle } = require('../src/kernel/paths');

function library(entries) {
  const root = tempDir('turink-apps-');
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

function found(result, root) {
  return Object.fromEntries(result.items.map((item) => [path.relative(root, item.path), item.basis]));
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
  assert.deepStrictEqual(findLeftovers(target, [target], root), { items: [], kept: [] });
});

test('components shipped inside the app are matched unless another app ships them too', () => {
  const root = library([
    'Containers/com.example.app',
    'Containers/com.example.launcher',
    'Application Scripts/com.example.launcher',
    'Application Support/FileProvider/com.example.app.fileprovider',
    'Caches/com.example.crashreporter',
    'Preferences/com.example.launcher.plist',
  ]);
  const target = app();
  const facts = {
    components: ['com.example.launcher', 'com.example.app.fileprovider', 'com.example.crashreporter'],
    groups: [],
    siblings: [{ name: 'Example Pro', bundleId: 'com.example.pro', components: ['com.example.crashreporter'], groups: [] }],
  };
  const result = found(findLeftovers(target, [target], root, facts), root);

  assert.deepStrictEqual(result, {
    'Application Scripts/com.example.launcher': 'component',
    'Application Support/FileProvider/com.example.app.fileprovider': 'component',
    'Containers/com.example.app': 'bundle-id',
    'Containers/com.example.launcher': 'component',
    'Preferences/com.example.launcher.plist': 'component',
  });
});

test('declared data groups are removed unless another app of the vendor declares them', () => {
  const root = library([
    'Group Containers/ABCDE.example.own',
    'Application Scripts/ABCDE.example.own',
    'Group Containers/ABCDE.example.shared',
    'Group Containers/ABCDE.example.undeclared',
  ]);
  const target = app();
  const facts = {
    components: [],
    groups: ['ABCDE.example.own', 'ABCDE.example.shared', 'ABCDE.example.absent'],
    siblings: [{ name: 'Example Pro', bundleId: 'com.example.pro', components: [], groups: ['ABCDE.example.shared'] }],
  };
  const result = findLeftovers(target, [target], root, facts);

  assert.deepStrictEqual(found(result, root), {
    'Application Scripts/ABCDE.example.own': 'group',
    'Group Containers/ABCDE.example.own': 'group',
  });
  assert.deepStrictEqual(
    result.kept.map((entry) => [path.relative(root, entry.path), entry.sharedWith]),
    [['Group Containers/ABCDE.example.shared', ['Example Pro']]]
  );
});

test('another installed copy of the same app keeps its data', () => {
  const root = library(['Caches/com.example.app', 'Application Support/Example']);
  const target = app();
  const copy = app({ path: '/Users/someone/Applications/Example.app' });
  assert.deepStrictEqual(findLeftovers(target, [target, copy], root).items, []);
});

test('a folder that cannot be read fully is marked as of unknown size', { skip: process.getuid && process.getuid() === 0 }, () => {
  const root = library(['Containers/com.example.app/Data/Library']);
  const locked = path.join(root, 'Containers/com.example.app/Data');
  fs.writeFileSync(path.join(locked, 'Library', 'file'), 'x'.repeat(10000));
  fs.chmodSync(locked, 0o000);
  try {
    const target = app();
    const [item] = findLeftovers(target, [target], root).items;
    assert.strictEqual(item.sizeUnknown, true);
  } finally {
    fs.chmodSync(locked, 0o755);
  }
});

test('a cloud storage folder belongs to the app whose identifier its provider extends most closely', () => {
  const apps = [
    { path: '/Applications/Drive.app', bundleId: 'com.example.drive' },
    { path: '/Applications/Drive Beta.app', bundleId: 'com.example.drive.beta' },
    { path: '/Applications/Other.app', bundleId: 'com.example.driver' },
  ];
  const owned = cloudOwners(
    [
      { path: '/c/Drive-me', provider: 'com.example.drive.fileprovider' },
      { path: '/c/DriveBeta-me', provider: 'com.example.drive.beta.fileprovider' },
      { path: '/c/Unknown-me', provider: 'com.unknown.fp' },
    ],
    apps
  );
  assert.deepStrictEqual(Object.fromEntries(owned), {
    '/Applications/Drive.app': ['/c/Drive-me'],
    '/Applications/Drive Beta.app': ['/c/DriveBeta-me'],
  });
});

test('data groups are read from the signature and vendors from the identifier', () => {
  const xml = `<?xml version="1.0"?><plist><dict>
    <key>com.apple.security.app-sandbox</key><true/>
    <key>com.apple.security.application-groups</key>
    <array><string>ABCDE.one</string><string>group.com.example.two</string><string>../escape</string></array>
  </dict></plist>`;
  assert.deepStrictEqual(appGroups(xml), ['ABCDE.one', 'group.com.example.two']);
  assert.deepStrictEqual(appGroups('<plist><dict></dict></plist>'), []);

  assert.strictEqual(vendorOf('com.microsoft.OneDrive'), 'com.microsoft');
  assert.strictEqual(vendorOf('imagetasks.Pixea'), 'imagetasks');
  assert.strictEqual(vendorOf('com.apple.dt.Xcode'), null);
  assert.strictEqual(vendorOf('single'), null);
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
