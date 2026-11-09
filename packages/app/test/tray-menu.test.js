'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { template } = require('../src/tray-menu');

function folder(overrides) {
  return { path: '/Users/me/Desktop/a', name: 'a', source: 'desktop', place: 'Desktop', parents: [], trail: ['a'], available: true, clash: null, ...overrides };
}

function actions() {
  const calls = [];
  return {
    calls,
    open: (f) => calls.push(['open', f.path]),
    add: () => calls.push(['add']),
    edit: () => calls.push(['edit']),
    screen: (id) => calls.push(['screen', id]),
    window: () => calls.push(['window']),
  };
}

test('the top level holds the screens and Folders, then the window and Quit', () => {
  const menu = template([], [], actions(), 'Turink Toys');
  assert.deepStrictEqual(
    menu.map((item) => item.label || item.type),
    ['Applications', 'Power', 'Folders', 'separator', 'Open Turink Toys', 'Quit']
  );
  assert.ok(menu[2].submenu);
  assert.strictEqual(menu[5].role, 'quit');
});

test('screen items carry the names they are given, the rest stays English', () => {
  const menu = template([], [], actions(), 'Turink Toys', { apps: '앱 관리', power: '전원', folders: '폴더' });
  assert.deepStrictEqual(
    menu.map((item) => item.label || item.type),
    ['앱 관리', '전원', '폴더', 'separator', 'Open Turink Toys', 'Quit']
  );
});

test('the screen items open the window on their screen', () => {
  const a = actions();
  const menu = template([], [], a, 'Turink Toys');
  menu.find((item) => item.label === 'Applications').click();
  menu.find((item) => item.label === 'Power').click();
  menu.find((item) => item.label === 'Open Turink Toys').click();
  assert.deepStrictEqual(a.calls, [['screen', 'apps'], ['screen', 'power'], ['window']]);
});

test('an empty list says so and still offers adding', () => {
  const sub = template([], [], actions(), 'Turink Toys').find((item) => item.submenu).submenu;
  assert.deepStrictEqual(sub.map((item) => item.label || item.type), ['No folders yet', 'separator', 'Add Folder…', 'Edit Folders…']);
  assert.strictEqual(sub[0].enabled, false);
});

test('each folder opens on click and shows where it lives', () => {
  const a = actions();
  const sub = template(
    [
      folder({ path: '/Users/me/Desktop/project/turink/labs/src/x', name: 'x', parents: ['project', 'turink', 'labs', 'src'], trail: ['project', 'turink', 'labs', 'src', 'x'] }),
      folder({ path: '/Volumes/Photos/raw', name: 'raw', source: 'volume', place: 'Photos', available: false }),
    ],
    [],
    a,
    'Turink Toys'
  ).find((item) => item.submenu).submenu;

  assert.strictEqual(sub[0].label, 'x');
  assert.strictEqual(sub[0].sublabel, 'Desktop › … › turink › labs › src › x');
  assert.strictEqual(sub[0].toolTip, '/Users/me/Desktop/project/turink/labs/src/x');
  assert.strictEqual(sub[0].enabled, true);
  sub[0].click();
  assert.deepStrictEqual(a.calls, [['open', '/Users/me/Desktop/project/turink/labs/src/x']]);

  assert.strictEqual(sub[1].enabled, false);
  assert.strictEqual(sub[1].sublabel, 'Not connected');
});

test('the submenu ends with adding and editing', () => {
  const a = actions();
  const sub = template([folder()], [], a, 'Turink Toys').find((item) => item.submenu).submenu;
  sub.find((item) => item.label === 'Add Folder…').click();
  sub.find((item) => item.label === 'Edit Folders…').click();
  assert.deepStrictEqual(a.calls, [['add'], ['edit']]);
});

test('groups become headings inside the one submenu', () => {
  const sub = template(
    [
      folder({ path: '/1', name: 'loose' }),
      folder({ path: '/2', name: 'w1', group: 'Work' }),
      folder({ path: '/3', name: 'h1', group: 'Home' }),
      folder({ path: '/4', name: 'w2', group: 'Work' }),
    ],
    [{ name: 'Home', count: 1 }, { name: 'Empty', count: 0 }, { name: 'Work', count: 2 }],
    actions(),
    'Turink Toys'
  ).find((item) => item.submenu).submenu;
  assert.deepStrictEqual(
    sub.map((item) => (item.type === 'header' ? `[${item.label}]` : item.label || item.type)),
    ['loose', 'separator', '[Home]', 'h1', 'separator', '[Work]', 'w1', 'w2', 'separator', 'Add Folder…', 'Edit Folders…']
  );
  assert.ok(sub.every((item) => !(item.submenu)), 'no nested submenus');
});

test('with only grouped folders the submenu starts with a heading', () => {
  const sub = template([folder({ group: 'Work' })], [{ name: 'Work', count: 1 }], actions(), 'Turink Toys').find((item) => item.submenu).submenu;
  assert.deepStrictEqual(sub.slice(0, 2).map((item) => item.type || 'item'), ['header', 'item']);
});
