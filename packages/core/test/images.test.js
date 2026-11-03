'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const core = require('../src');
const formats = require('../src/tasks/images/formats');
const store = require('../src/tasks/images/store');
const files = require('../src/tasks/images/files');

function temp() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'turink-images-')));
}

function touch(dir, name, content = 'x') {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function memory(initial) {
  const data = initial === undefined ? {} : { 'images.selected': initial };
  return { get: (key, fallback) => (data[key] === undefined ? fallback : data[key]), set: (key, value) => (data[key] = value), data };
}

const run = { progress() {}, warn(code, payload) { this.warnings.push({ code, ...payload }); }, warnings: [] };

// Tasks that read the real settings are exercised only where they leave them
// alone; anything that writes goes through the helpers with memory storage.
function list(folder, hidden) {
  return core.registry.get('images.list').execute(run, { folder, hidden: hidden === true });
}

test('formats sort into direct, convert and raw, whatever the letter case', () => {
  assert.strictEqual(formats.kindOf('/a/b/IMG_1.JPG'), 'direct');
  assert.strictEqual(formats.kindOf('x.webp'), 'direct');
  assert.strictEqual(formats.kindOf('x.HEIC'), 'convert');
  assert.strictEqual(formats.kindOf('x.tiff'), 'convert');
  assert.strictEqual(formats.kindOf('x.CR3'), 'raw');
  assert.strictEqual(formats.kindOf('x.dng'), 'raw');
  assert.strictEqual(formats.kindOf('x.txt'), null);
  assert.strictEqual(formats.kindOf('jpg'), null);
  assert.strictEqual(formats.isImage('x.png'), true);
  assert.strictEqual(formats.isImage('x.pdf'), false);
  assert.strictEqual(core.images.isImage, formats.isImage);
});

test('names sort the way Finder shows them', () => {
  const names = ['IMG_10.jpg', 'img_2.jpg', 'IMG_1.jpg', 'b.jpg', 'A.jpg'];
  assert.deepStrictEqual(names.sort(formats.compareNames), ['A.jpg', 'b.jpg', 'IMG_1.jpg', 'img_2.jpg', 'IMG_10.jpg']);
});

test('the new codes are registered and fail with the general exit code', () => {
  assert.strictEqual(core.errors.CODES.NOT_A_FOLDER, core.errors.EXIT.FAILED);
  assert.strictEqual(core.errors.CODES.NOT_AN_IMAGE, core.errors.EXIT.FAILED);
});

test('all seven tasks are registered with the expected risk', () => {
  const expected = {
    'images.list': 'read',
    'images.selected': 'read',
    'images.select': 'mutate',
    'images.copy': 'create',
    'images.move': 'mutate',
    'images.trash': 'destroy',
    'images.restore': 'create',
  };
  for (const [id, risk] of Object.entries(expected)) assert.strictEqual(core.registry.get(id).risk, risk, id);
  assert.strictEqual(core.registry.get('images.select').preference, true);
});

test('listing separates folders from photos, counts photos in folders and sorts by name', async () => {
  const dir = temp();
  touch(dir, 'IMG_10.jpg', '1234');
  touch(dir, 'IMG_2.HEIC');
  touch(dir, 'notes.txt');
  touch(dir, '.hidden.jpg');
  touch(dir, 'trip 2/a.jpg');
  touch(dir, 'trip 2/b.png');
  touch(dir, 'trip 2/c.txt');
  touch(dir, 'trip 10/a.jpg');
  touch(dir, '.secret/a.jpg');
  touch(dir, 'Library.photoslibrary/a.jpg');
  touch(dir, 'Thing.app/a.jpg');

  const result = await list(dir);
  assert.strictEqual(result.folder, dir);
  assert.strictEqual(result.parent, path.dirname(dir));
  assert.deepStrictEqual(result.images.map((i) => i.name), ['IMG_2.HEIC', 'IMG_10.jpg']);
  assert.deepStrictEqual(result.images.map((i) => i.kind), ['convert', 'direct']);
  assert.strictEqual(result.images[1].bytes, 4);
  assert.strictEqual(result.images[1].path, path.join(dir, 'IMG_10.jpg'));
  assert.ok(!Number.isNaN(Date.parse(result.images[1].modified)));
  assert.deepStrictEqual(result.folders.map((f) => [f.name, f.images]), [['trip 2', 2], ['trip 10', 1]]);

  const withHidden = await list(dir, true);
  assert.ok(withHidden.images.some((i) => i.name === '.hidden.jpg'));
  assert.ok(withHidden.folders.some((f) => f.name === '.secret'));
  assert.ok(!withHidden.folders.some((f) => f.name.endsWith('.app')));
});

test('listing does not follow a linked folder but shows a linked photo', async () => {
  const dir = temp();
  const real = touch(dir, 'real/a.jpg');
  fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'loop'));
  fs.symlinkSync(real, path.join(dir, 'link.jpg'));

  const result = await list(dir);
  assert.deepStrictEqual(result.folders.map((f) => f.name), ['real']);
  assert.deepStrictEqual(result.images.map((i) => i.name), ['link.jpg']);
});

test('listing reports a missing path and a file, and no parent above the root', async () => {
  const dir = temp();
  const file = touch(dir, 'a.jpg');
  await assert.rejects(list(path.join(dir, 'nope')), { code: 'SRC_NOT_FOUND' });
  await assert.rejects(list(file), { code: 'NOT_A_FOLDER' });
  assert.strictEqual((await list('/')).parent, null);
});

test('listing defaults to the Pictures folder', () => {
  const input = core.registry.get('images.list').input.properties.folder;
  assert.strictEqual(input.default, '~/Pictures');
});

test('a selection change adds, removes and clears, and reports what changed', () => {
  const exists = () => true;
  let outcome = store.change([], { paths: ['/a.jpg', '/b.jpg'] }, exists);
  assert.deepStrictEqual(outcome.list, ['/a.jpg', '/b.jpg']);
  assert.deepStrictEqual(outcome.changed, ['/a.jpg', '/b.jpg']);

  outcome = store.change(outcome.list, { paths: ['/b.jpg', '/c.jpg'] }, exists);
  assert.deepStrictEqual(outcome.list, ['/a.jpg', '/b.jpg', '/c.jpg']);
  assert.deepStrictEqual(outcome.changed, ['/c.jpg']);

  outcome = store.change(outcome.list, { paths: ['/a.jpg', '/zzz.jpg'], off: true }, exists);
  assert.deepStrictEqual(outcome.list, ['/b.jpg', '/c.jpg']);
  assert.deepStrictEqual(outcome.changed, ['/a.jpg']);

  outcome = store.change(outcome.list, { clear: true }, exists);
  assert.deepStrictEqual(outcome.list, []);
  assert.deepStrictEqual(outcome.changed, ['/b.jpg', '/c.jpg']);
});

test('vanished paths are dropped only when the selection changes', () => {
  const alive = new Set(['/a.jpg', '/c.jpg']);
  const exists = (entry) => alive.has(entry);
  const unchanged = store.change(['/a.jpg', '/gone.jpg'], { paths: ['/a.jpg'] }, exists);
  assert.deepStrictEqual(unchanged.changed, []);
  assert.deepStrictEqual(unchanged.list, ['/a.jpg', '/gone.jpg']);

  const changed = store.change(['/a.jpg', '/gone.jpg'], { paths: ['/c.jpg'] }, exists);
  assert.deepStrictEqual(changed.list, ['/a.jpg', '/c.jpg']);
});

test('the selection is kept as stored and ignores a damaged value', () => {
  const storage = memory(['/a.jpg']);
  assert.deepStrictEqual(store.load(storage), ['/a.jpg']);
  store.save(['/b.jpg'], storage);
  assert.deepStrictEqual(storage.data['images.selected'], ['/b.jpg']);
  assert.deepStrictEqual(store.load(memory('oops')), []);
  assert.deepStrictEqual(store.load(memory([1, null, '/ok.jpg'])), ['/ok.jpg']);
});

test('images.selected reads without changing the saved list', async () => {
  const dir = temp();
  const kept = touch(dir, 'kept.jpg');
  const original = core.settings.get('images.selected', undefined);
  // The task reads the real store, so it is replaced for the length of the
  // call and put back afterwards.
  const realGet = core.settings.get;
  const realSet = core.settings.set;
  const storage = memory([kept, path.join(dir, 'gone.jpg')]);
  core.settings.get = storage.get;
  core.settings.set = storage.set;
  try {
    const before = JSON.stringify(storage.data);
    const result = await core.registry.get('images.selected').execute(run, {});
    assert.deepStrictEqual(result.images, [{ path: kept, folder: dir, name: 'kept.jpg' }]);
    assert.deepStrictEqual(result.missing, [path.join(dir, 'gone.jpg')]);
    assert.strictEqual(JSON.stringify(storage.data), before);
  } finally {
    core.settings.get = realGet;
    core.settings.set = realSet;
  }
  assert.deepStrictEqual(core.settings.get('images.selected', undefined), original);
});

test('only existing photos can be named, and anything else is refused up front', () => {
  const dir = temp();
  const photo = touch(dir, 'a.jpg', 'abc');
  const text = touch(dir, 'a.txt');
  fs.mkdirSync(path.join(dir, 'folder.jpg'));

  assert.deepStrictEqual(files.requireImages([photo, photo]), [{ path: photo, bytes: 3 }]);
  assert.throws(() => files.requireImages([text]), { code: 'NOT_AN_IMAGE' });
  assert.throws(() => files.requireImages([path.join(dir, 'folder.jpg')]), { code: 'NOT_AN_IMAGE' });
  assert.throws(() => files.requireImages([photo, path.join(dir, 'missing.jpg')]), { code: 'SRC_NOT_FOUND' });
  assert.throws(() => files.requireFolder(photo), { code: 'NOT_A_FOLDER' });
  assert.throws(() => files.requireFolder(path.join(dir, 'nope')), { code: 'SRC_NOT_FOUND' });
});

test('a taken name gets "name 2", "name 3" like Finder', () => {
  const dir = temp();
  assert.strictEqual(files.uniqueName(dir, 'a.jpg'), 'a.jpg');
  touch(dir, 'a.jpg');
  assert.strictEqual(files.uniqueName(dir, 'a.jpg'), 'a 2.jpg');
  touch(dir, 'a 2.jpg');
  assert.strictEqual(files.uniqueName(dir, 'a.jpg'), 'a 3.jpg');
});

test('copying never overwrites and keeps the original', async () => {
  const src = temp();
  const dest = temp();
  const photo = touch(src, 'a.jpg', 'new');
  touch(dest, 'a.jpg', 'old');
  fs.utimesSync(photo, new Date(2020, 0, 1), new Date(2020, 0, 1));

  const first = await files.transfer(run, 'copy', [photo], dest);
  assert.deepStrictEqual(first.done, [{ from: photo, to: path.join(dest, 'a 2.jpg') }]);
  const second = await files.transfer(run, 'copy', [photo], dest);
  assert.strictEqual(second.done[0].to, path.join(dest, 'a 3.jpg'));

  assert.strictEqual(fs.readFileSync(path.join(dest, 'a.jpg'), 'utf8'), 'old');
  assert.strictEqual(fs.readFileSync(path.join(dest, 'a 2.jpg'), 'utf8'), 'new');
  assert.ok(fs.existsSync(photo));
  assert.strictEqual(fs.statSync(path.join(dest, 'a 2.jpg')).mtime.getFullYear(), 2020);
});

test('copying two photos of the same name keeps both', async () => {
  const one = touch(temp(), 'a.jpg', '1');
  const two = touch(temp(), 'a.jpg', '2');
  const dest = temp();
  const { done } = await files.transfer(run, 'copy', [one, two], dest);
  assert.deepStrictEqual(done.map((d) => path.basename(d.to)), ['a.jpg', 'a 2.jpg']);
});

test('moving renames, avoids clashes and rewrites the selection', async () => {
  const src = temp();
  const dest = temp();
  const a = touch(src, 'a.jpg', 'a');
  const b = touch(src, 'b.jpg', 'b');
  const other = touch(src, 'other.jpg');
  touch(dest, 'a.jpg', 'old');
  const storage = memory([a, other]);

  const { done, failed } = await files.transfer(run, 'move', [a, b], dest, storage);
  assert.deepStrictEqual(failed, []);
  assert.deepStrictEqual(done, [
    { from: a, to: path.join(dest, 'a 2.jpg') },
    { from: b, to: path.join(dest, 'b.jpg') },
  ]);
  assert.ok(!fs.existsSync(a));
  assert.strictEqual(fs.readFileSync(path.join(dest, 'a.jpg'), 'utf8'), 'old');
  assert.strictEqual(fs.readFileSync(path.join(dest, 'a 2.jpg'), 'utf8'), 'a');
  assert.deepStrictEqual(storage.data['images.selected'], [path.join(dest, 'a 2.jpg'), other]);
});

test('moving into the folder a photo is already in leaves it alone', async () => {
  const dir = temp();
  const a = touch(dir, 'a.jpg');
  const storage = memory([a]);
  const { done } = await files.transfer(run, 'move', [a], dir, storage);
  assert.deepStrictEqual(done, [{ from: a, to: a }]);
  assert.deepStrictEqual(storage.data['images.selected'], [a]);
});

test('a move across volumes falls back to copy and remove', async () => {
  const src = temp();
  const dest = temp();
  const a = touch(src, 'a.jpg', 'a');
  const realRename = fs.promises.rename;
  fs.promises.rename = async () => {
    throw Object.assign(new Error('cross-device'), { code: 'EXDEV' });
  };
  try {
    const target = await files.moveInto(a, dest);
    assert.strictEqual(target, path.join(dest, 'a.jpg'));
  } finally {
    fs.promises.rename = realRename;
  }
  assert.ok(!fs.existsSync(a));
  assert.strictEqual(fs.readFileSync(path.join(dest, 'a.jpg'), 'utf8'), 'a');
});

test('a bad destination or source stops the run before any file is touched', async () => {
  const src = temp();
  const a = touch(src, 'a.jpg');
  const text = touch(src, 'a.txt');
  const dest = temp();

  await assert.rejects(files.transfer(run, 'move', [a], path.join(dest, 'nope'), memory()), { code: 'SRC_NOT_FOUND' });
  await assert.rejects(files.transfer(run, 'move', [a], a, memory()), { code: 'NOT_A_FOLDER' });
  await assert.rejects(files.transfer(run, 'copy', [a, text], dest), { code: 'NOT_AN_IMAGE' });
  assert.ok(fs.existsSync(a));
  assert.deepStrictEqual(fs.readdirSync(dest), []);
});

test('a photo that cannot be moved is reported and the rest still go through', async () => {
  const src = temp();
  const dest = temp();
  const a = touch(src, 'a.jpg');
  const b = touch(src, 'b.jpg');
  const realRename = fs.promises.rename;
  fs.promises.rename = async (from, to) => {
    if (path.basename(from) === 'a.jpg') throw Object.assign(new Error('denied'), { code: 'EACCES' });
    return realRename(from, to);
  };
  const local = { progress() {}, warn(code, payload) { this.warnings.push({ code, ...payload }); }, warnings: [] };
  try {
    const { done, failed } = await files.transfer(local, 'move', [a, b], dest, memory());
    assert.deepStrictEqual(done.map((d) => d.from), [b]);
    assert.deepStrictEqual(failed, [{ path: a, message: 'denied' }]);
  } finally {
    fs.promises.rename = realRename;
  }
  assert.strictEqual(local.warnings[0].code, 'MOVE_FAILED');
  assert.ok(fs.existsSync(a));
});

test('trashing plans every photo with its size and refuses what is not a photo', async () => {
  const dir = temp();
  const a = touch(dir, 'a.jpg', '12345');
  const text = touch(dir, 'a.txt');
  const task = core.registry.get('images.trash');

  const plan = await task.plan(run, { paths: [a, a] });
  assert.deepStrictEqual(plan.items, [{ path: a, bytes: 5 }]);
  assert.strictEqual(plan.bytes, 5);
  await assert.rejects(task.plan(run, { paths: [text] }), { code: 'NOT_AN_IMAGE' });
  await assert.rejects(task.plan(run, { paths: [path.join(dir, 'missing.jpg')] }), { code: 'SRC_NOT_FOUND' });
  assert.ok(fs.existsSync(a));
});

test('trashing is a destroy task with a plan, so it cannot run unconfirmed', () => {
  const task = core.registry.get('images.trash');
  assert.strictEqual(typeof task.plan, 'function');
  assert.strictEqual(require('../src/kernel/manifest').requiresConfirmation(task), true);
});

test('the trash result carries what the shared restore helper reads', () => {
  const task = core.registry.get('images.trash');
  const shown = task.present({ trashed: [{ from: '/a.jpg', trashName: 'a.jpg', bytes: 1 }], failed: [], freedReadable: '1 B', restorable: true }, (key, fallback) => fallback);
  assert.ok(shown.rows.length >= 2);
  assert.strictEqual(core.registry.get('images.restore').input.properties.run.optionsFrom.runs, 'images.trash');
});

test('every input of the new tasks has Korean text', () => {
  for (const task of core.registry.all().filter((t) => t.domain === 'images')) {
    const localized = core.i18n.localizeTask(task, 'ko');
    assert.notStrictEqual(localized.title, task.title, task.id);
    assert.notStrictEqual(localized.whenToUse, task.whenToUse, task.id);
    for (const [name, rule] of Object.entries(localized.input.properties || {})) {
      assert.notStrictEqual(rule.label, task.input.properties[name].label, `${task.id} ${name}`);
      assert.notStrictEqual(rule.description, task.input.properties[name].description, `${task.id} ${name}`);
    }
  }
  for (const code of ['NOT_A_FOLDER', 'NOT_AN_IMAGE']) {
    const localized = core.i18n.localizeError({ code, message: 'm', hint: 'h' }, 'ko');
    assert.notStrictEqual(localized.message, 'm');
  }
});
