'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const store = require('../src/tasks/folders/store');

// A home directory of throwaway folders, so the tests never read or write the
// person's own settings.
function home(dirs = []) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'turink-folders-')));
  for (const dir of dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });
  return root;
}

function memory(initial) {
  const data = initial === undefined ? {} : { folders: initial };
  return { get: (key, fallback) => (data[key] === undefined ? fallback : data[key]), set: (key, value) => (data[key] = value), data };
}

test('a folder is added once, however its path is written', () => {
  const h = home(['Desktop/project']);
  let list = [];
  let outcome = store.add(list, '~/Desktop/project', undefined, h);
  assert.strictEqual(outcome.added, true);
  list = outcome.list;

  for (const spelling of [path.join(h, 'Desktop/project/'), path.join(h, 'Desktop/./project'), '~/Desktop/project']) {
    outcome = store.add(list, spelling, undefined, h);
    assert.strictEqual(outcome.added, false, spelling);
    assert.strictEqual(outcome.index, 0);
  }
  assert.strictEqual(outcome.list.length, 1);
});

test('only an existing folder can be added', () => {
  const h = home(['Desktop']);
  fs.writeFileSync(path.join(h, 'Desktop/note.txt'), 'x');
  assert.throws(() => store.add([], '~/Desktop/note.txt', undefined, h), { code: 'INVALID_INPUT' });
  assert.throws(() => store.add([], '~/Desktop/missing', undefined, h), { code: 'SRC_NOT_FOUND' });
});

test('a custom name is kept only when given', () => {
  const h = home(['a', 'b']);
  let { list } = store.add([], '~/a', '  Work  ', h);
  ({ list } = store.add(list, '~/b', '   ', h));
  assert.deepStrictEqual(list, [{ path: path.join(h, 'a'), name: 'Work' }, { path: path.join(h, 'b') }]);
});

test('reordering clamps to the ends of the list', () => {
  const h = home(['a', 'b', 'c']);
  const list = ['a', 'b', 'c'].map((name) => ({ path: path.join(h, name) }));
  const names = (l) => l.map((entry) => path.basename(entry.path)).join('');

  assert.strictEqual(names(store.reorder(list, '~/c', 1, h).list), 'cab');
  assert.strictEqual(names(store.reorder(list, '~/a', 2, h).list), 'bac');
  const last = store.reorder(list, '~/a', 99, h);
  assert.strictEqual(names(last.list), 'bca');
  assert.strictEqual(last.position, 3);
  assert.strictEqual(names(store.reorder(list, '~/b', 0, h).list), 'bac');
  assert.throws(() => store.reorder(list, '~/zzz', 1, h), { code: 'SRC_NOT_FOUND' });
});

test('renaming to nothing returns to the folder name', () => {
  const h = home(['a']);
  const list = [{ path: path.join(h, 'a') }];
  const named = store.rename(list, '~/a', 'Work', h).list;
  assert.strictEqual(store.describe(named, h)[0].name, 'Work');
  assert.strictEqual(store.describe(named, h)[0].customName, true);
  const reset = store.rename(named, '~/a', '', h).list;
  assert.deepStrictEqual(reset, [{ path: path.join(h, 'a') }]);
  assert.strictEqual(store.describe(reset, h)[0].name, 'a');
});

test('removing takes the entry off and leaves the folder alone', () => {
  const h = home(['a', 'b']);
  const list = [{ path: path.join(h, 'a') }, { path: path.join(h, 'b') }];
  const outcome = store.remove(list, '~/a', h);
  assert.deepStrictEqual(outcome.list, [{ path: path.join(h, 'b') }]);
  assert.ok(fs.existsSync(path.join(h, 'a')));
  assert.throws(() => store.remove(outcome.list, '~/a', h), { code: 'SRC_NOT_FOUND' });
});

test('places are recognised from the path', () => {
  const h = home();
  const where = (rel) => store.locate(path.join(h, rel), h);

  assert.deepStrictEqual(where('Desktop/project/labs'), { source: 'desktop', place: 'Desktop', parts: ['project', 'labs'] });
  assert.strictEqual(where('Documents/x').source, 'documents');
  assert.strictEqual(where('Downloads/x').source, 'downloads');
  assert.deepStrictEqual(where('Library/CloudStorage/OneDrive-Personal/finger/docs'), {
    source: 'onedrive',
    place: 'OneDrive-Personal',
    parts: ['finger', 'docs'],
  });
  assert.strictEqual(where('Library/CloudStorage/GoogleDrive-me@example.com/x').source, 'gdrive');
  assert.strictEqual(where('Library/CloudStorage/Dropbox/x').source, 'dropbox');
  assert.strictEqual(where('Library/CloudStorage/Box-Box/x').source, 'cloud');
  assert.strictEqual(where('Library/Mobile Documents/com~apple~CloudDocs/Notes').source, 'icloud');
  assert.strictEqual(where('OneDrive/x').source, 'onedrive');
  assert.deepStrictEqual(where('Projects/x'), { source: 'home', place: path.basename(h), parts: ['Projects', 'x'] });
  assert.deepStrictEqual(store.locate('/Volumes/Photos/2026/raw', h), { source: 'volume', place: 'Photos', parts: ['2026', 'raw'] });
  assert.deepStrictEqual(store.locate('/opt/data', h), { source: 'disk', place: '/', parts: ['opt', 'data'] });
});

test('a well-known place saved itself is located by what contains it', () => {
  const h = home(['Downloads']);
  const [item] = store.describe([{ path: path.join(h, 'Downloads') }], h);
  assert.strictEqual(item.name, 'Downloads');
  assert.strictEqual(item.source, 'home');
  assert.deepStrictEqual(item.parents, []);

  const [disk] = store.describe([{ path: '/Volumes/Photos' }], h);
  assert.strictEqual(disk.source, 'volume');
  assert.strictEqual(disk.available, fs.existsSync('/Volumes/Photos'));
});

test('entries sharing a name say what tells them apart', () => {
  const h = home(['Documents/docs', 'Desktop/ref/docs', 'Desktop/old/docs', 'Desktop/solo']);
  const list = ['Documents/docs', 'Desktop/ref/docs', 'Desktop/solo'].map((rel) => ({ path: path.join(h, rel) }));
  const byPlace = store.describe(list, h);
  assert.deepStrictEqual(byPlace.map((item) => item.clash), ['place', 'place', null]);

  const samePlace = store.describe(
    ['Desktop/ref/docs', 'Desktop/old/docs'].map((rel) => ({ path: path.join(h, rel) })),
    h
  );
  assert.deepStrictEqual(samePlace.map((item) => item.clash), ['parent', 'parent']);
  assert.deepStrictEqual(samePlace.map((item) => item.parents), [['ref'], ['old']]);

  // A custom name counts, in any letter case.
  const renamed = store.describe([{ path: path.join(h, 'Desktop/solo'), name: 'DOCS' }, ...list.slice(0, 1)], h);
  assert.deepStrictEqual(renamed.map((item) => item.clash), ['place', 'place']);
});

test('a folder that has gone is still listed, marked unavailable', () => {
  const h = home(['a']);
  const list = [{ path: path.join(h, 'a') }];
  fs.rmSync(path.join(h, 'a'), { recursive: true });
  const [item] = store.describe(list, h);
  assert.strictEqual(item.available, false);
  assert.strictEqual(item.name, 'a');
});

test('the stored list survives a round trip and ignores damaged entries', () => {
  const storage = memory([{ path: '/x' }, null, { name: 'no path' }, 'text', { path: '/y', name: 'Y' }]);
  const list = store.load(storage);
  assert.deepStrictEqual(list, [{ path: '/x' }, { path: '/y', name: 'Y' }]);
  store.save(list, storage);
  assert.deepStrictEqual(storage.data.folders, [{ path: '/x' }, { path: '/y', name: 'Y' }]);
  assert.deepStrictEqual(store.load(memory('not a list')), []);
  assert.deepStrictEqual(store.load(memory()), []);
});

test('editing the list is a preference, so the window can leave no journal entry', () => {
  const { registry } = require('../src');
  for (const id of ['folders.add', 'folders.remove', 'folders.reorder', 'folders.rename', 'folders.add-group', 'folders.rename-group', 'folders.remove-group', 'folders.reorder-group']) {
    const task = registry.get(id);
    assert.strictEqual(task.preference, true, id);
    assert.strictEqual(task.risk, 'mutate', id);
  }
  for (const id of ['folders.list', 'folders.open']) assert.strictEqual(registry.get(id).risk, 'read', id);
  assert.strictEqual(registry.get('disk.clean').preference, false);
});

// ------------------------------------------------------------- groups

function paths(h, list) {
  return list.map((entry) => `${path.relative(h, entry.path)}${entry.group ? `@${entry.group}` : ''}`).join(' ');
}

test('a folder can be added straight into a group', () => {
  const h = home(['a', 'b']);
  let { list } = store.add([], '~/a', undefined, h, 'Work');
  ({ list } = store.add(list, '~/b', undefined, h));
  assert.strictEqual(paths(h, list), 'a@Work b');
  assert.deepStrictEqual(store.describe(list, h).map((item) => item.group), ['Work', null]);
});

test('reordering counts positions within the section', () => {
  const h = home(['a', 'b', 'c', 'd', 'e']);
  const list = [
    { path: path.join(h, 'a') },
    { path: path.join(h, 'b'), group: 'G' },
    { path: path.join(h, 'c') },
    { path: path.join(h, 'd'), group: 'G' },
    { path: path.join(h, 'e'), group: 'H' },
  ];
  // Within the ungrouped section, c goes first; the grouped entries keep their order.
  assert.strictEqual(paths(h, store.reorder(list, '~/c', 1, h).list), 'c a b@G d@G e@H');
  // Within G, d goes first.
  assert.strictEqual(paths(h, store.reorder(list, '~/d', 1, h).list), 'a d@G b@G c e@H');
  // Past the end of G lands after its last member.
  assert.strictEqual(paths(h, store.reorder(list, '~/b', 99, h).list), 'a c d@G b@G e@H');
});

test('reordering can move an entry into or out of a group', () => {
  const h = home(['a', 'b', 'c']);
  const list = [{ path: path.join(h, 'a') }, { path: path.join(h, 'b'), group: 'G' }, { path: path.join(h, 'c') }];

  const into = store.reorder(list, '~/a', 1, h, 'G');
  assert.strictEqual(paths(h, into.list), 'a@G b@G c');
  assert.strictEqual(into.position, 1);

  const after = store.reorder(list, '~/c', 2, h, 'G');
  assert.strictEqual(paths(h, after.list), 'a b@G c@G');

  const out = store.reorder(list, '~/b', 99, h, null);
  assert.strictEqual(paths(h, out.list), 'a c b');
  assert.strictEqual(out.position, 3);

  // Into a group nobody is in yet: the entry simply carries the group.
  const fresh = store.reorder(list, '~/c', 1, h, 'Empty');
  assert.strictEqual(paths(h, fresh.list), 'a b@G c@Empty');
});

test('a renamed folder keeps its group', () => {
  const h = home(['a']);
  const list = [{ path: path.join(h, 'a'), group: 'G' }];
  assert.deepStrictEqual(store.rename(list, '~/a', 'X', h).list, [{ path: path.join(h, 'a'), name: 'X', group: 'G' }]);
  assert.deepStrictEqual(store.rename(list, '~/a', '', h).list, [{ path: path.join(h, 'a'), group: 'G' }]);
});

test('group names are unique, ignoring letter case', () => {
  let { groups } = store.addGroup([], '  Work ');
  assert.deepStrictEqual(groups, ['Work']);
  assert.throws(() => store.addGroup(groups, 'work'), { code: 'DEST_EXISTS' });
  assert.throws(() => store.addGroup(groups, '   '), { code: 'INVALID_INPUT' });
  ({ groups } = store.addGroup(groups, 'Home', 1));
  assert.deepStrictEqual(groups, ['Home', 'Work']);
  assert.strictEqual(store.findGroup(groups, 'WORK'), 'Work');
  assert.throws(() => store.findGroup(groups, 'nope'), { code: 'SRC_NOT_FOUND' });
});

test('renaming a group carries its folders along', () => {
  const list = [{ path: '/a', group: 'Work' }, { path: '/b' }, { path: '/c', group: 'Home' }];
  const outcome = store.renameGroup(list, ['Work', 'Home'], 'work', 'Clients');
  assert.deepStrictEqual(outcome.groups, ['Clients', 'Home']);
  assert.deepStrictEqual(outcome.list.map((entry) => entry.group || null), ['Clients', null, 'Home']);
  assert.throws(() => store.renameGroup(list, ['Work', 'Home'], 'Work', 'home'), { code: 'DEST_EXISTS' });
  // Changing only the letter case of its own name is allowed.
  assert.deepStrictEqual(store.renameGroup(list, ['Work', 'Home'], 'Work', 'WORK').groups, ['WORK', 'Home']);
});

test('removing a group keeps its folders at the end of the ungrouped section', () => {
  const list = [{ path: '/a', group: 'Work' }, { path: '/b' }, { path: '/c', group: 'Work' }, { path: '/d', group: 'Home' }];
  const outcome = store.removeGroup(list, ['Work', 'Home'], 'Work');
  assert.deepStrictEqual(outcome.groups, ['Home']);
  assert.deepStrictEqual(outcome.list, [{ path: '/b' }, { path: '/d', group: 'Home' }, { path: '/a' }, { path: '/c' }]);
  assert.strictEqual(outcome.released, 2);
});

test('groups reorder and survive a missing order entry', () => {
  assert.deepStrictEqual(store.reorderGroup(['A', 'B', 'C'], 'C', 1).groups, ['C', 'A', 'B']);
  assert.deepStrictEqual(store.reorderGroup(['A', 'B', 'C'], 'A', 99).groups, ['B', 'C', 'A']);

  const storage = memory([{ path: '/x', group: 'Lost' }, { path: '/y', group: 'Kept' }]);
  storage.set(store.GROUPS_KEY, ['Kept', 'Empty']);
  assert.deepStrictEqual(store.loadGroups(store.load(storage), storage), ['Kept', 'Empty', 'Lost']);
  store.save(store.load(storage), storage);
  assert.deepStrictEqual(storage.data.folders, [{ path: '/x', group: 'Lost' }, { path: '/y', group: 'Kept' }]);
});

test('the snapshot counts each group, empty ones included', () => {
  const h = home();
  const shown = store.snapshot([{ path: '/a', group: 'G' }, { path: '/b' }, { path: '/c', group: 'G' }], ['G', 'Empty'], h);
  assert.deepStrictEqual(shown.groups, [{ name: 'G', count: 2 }, { name: 'Empty', count: 0 }]);
  assert.strictEqual(shown.folders.length, 3);
});
