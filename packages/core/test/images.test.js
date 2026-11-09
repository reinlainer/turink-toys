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
function list(folder, hidden, sort) {
  return core.registry.get('images.list').execute(run, { folder, hidden: hidden === true, sort });
}

function count(folders, hidden) {
  return core.registry.get('images.count').execute(run, { folders, hidden: hidden === true });
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
  assert.strictEqual(formats.isImage('x.mp4'), false);
  assert.strictEqual(core.images.isImage, formats.isImage);
});

test('typeOf and isMedia tell photos, videos and PDFs apart', () => {
  assert.strictEqual(formats.typeOf('a.JPG'), 'photo');
  assert.strictEqual(formats.typeOf('a.cr3'), 'photo');
  assert.strictEqual(formats.typeOf('a.MP4'), 'video');
  assert.strictEqual(formats.typeOf('a.mkv'), 'video');
  assert.strictEqual(formats.typeOf('a.pdf'), 'pdf');
  assert.strictEqual(formats.typeOf('a.txt'), null);
  assert.strictEqual(formats.kindOf('a.mov'), 'video');
  assert.strictEqual(formats.kindOf('a.pdf'), 'pdf');
  assert.strictEqual(formats.isMedia('a.pdf'), true);
  assert.strictEqual(formats.isMedia('a.webm'), true);
  assert.strictEqual(formats.isMedia('a.heic'), true);
  assert.strictEqual(formats.isMedia('a.zip'), false);
  assert.strictEqual(core.images.isMedia, formats.isMedia);
  assert.strictEqual(core.images.typeOf, formats.typeOf);
});

test('names sort the way Finder shows them', () => {
  const names = ['IMG_10.jpg', 'img_2.jpg', 'IMG_1.jpg', 'b.jpg', 'A.jpg'];
  assert.deepStrictEqual(names.sort(formats.compareNames), ['A.jpg', 'b.jpg', 'IMG_1.jpg', 'img_2.jpg', 'IMG_10.jpg']);
});

test('the new codes are registered and fail with the general exit code', () => {
  assert.strictEqual(core.errors.CODES.NOT_A_FOLDER, core.errors.EXIT.FAILED);
  assert.strictEqual(core.errors.CODES.NOT_AN_IMAGE, core.errors.EXIT.FAILED);
});

test('all tasks are registered with the expected risk', () => {
  const expected = {
    'images.list': 'read',
    'images.count': 'read',
    'images.default-app': 'read',
    'images.set-default-app': 'mutate',
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

test('listing separates folders from files, adds videos and PDFs and sorts by name', async () => {
  const dir = temp();
  touch(dir, 'IMG_10.jpg', '1234');
  touch(dir, 'IMG_2.HEIC');
  touch(dir, 'notes.txt');
  touch(dir, 'clip.mp4');
  touch(dir, 'doc.pdf');
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
  assert.deepStrictEqual(result.images.map((i) => i.name), ['clip.mp4', 'doc.pdf', 'IMG_2.HEIC', 'IMG_10.jpg']);
  assert.deepStrictEqual(result.images.map((i) => i.kind), ['video', 'pdf', 'convert', 'direct']);
  assert.deepStrictEqual(result.images.map((i) => i.type), ['video', 'pdf', 'photo', 'photo']);
  const photo = result.images[3];
  assert.strictEqual(photo.bytes, 4);
  assert.strictEqual(photo.path, path.join(dir, 'IMG_10.jpg'));
  assert.ok(!Number.isNaN(Date.parse(photo.modified)));
  assert.deepStrictEqual(result.folders, [
    { name: 'trip 2', path: path.join(dir, 'trip 2') },
    { name: 'trip 10', path: path.join(dir, 'trip 10') },
  ]);

  const withHidden = await list(dir, true);
  assert.ok(withHidden.images.some((i) => i.name === '.hidden.jpg'));
  assert.ok(withHidden.folders.some((f) => f.name === '.secret'));
  assert.ok(!withHidden.folders.some((f) => f.name.endsWith('.app')));
});

test('listing sorts files by name, newest first, or by kind, with folders always first', async () => {
  const dir = temp();
  const old = touch(dir, 'b.jpg');
  const mid = touch(dir, 'a.mp4');
  const fresh = touch(dir, 'c.pdf');
  touch(dir, 'z.png');
  fs.mkdirSync(path.join(dir, 'zeta'));
  fs.mkdirSync(path.join(dir, 'alpha'));
  fs.utimesSync(old, new Date(2020, 0, 1), new Date(2020, 0, 1));
  fs.utimesSync(mid, new Date(2021, 0, 1), new Date(2021, 0, 1));
  fs.utimesSync(fresh, new Date(2022, 0, 1), new Date(2022, 0, 1));
  fs.utimesSync(path.join(dir, 'z.png'), new Date(2019, 0, 1), new Date(2019, 0, 1));

  const names = async (sort) => (await list(dir, false, sort)).images.map((i) => i.name);
  assert.deepStrictEqual(await names(undefined), ['a.mp4', 'b.jpg', 'c.pdf', 'z.png']);
  assert.deepStrictEqual(await names('name'), ['a.mp4', 'b.jpg', 'c.pdf', 'z.png']);
  assert.deepStrictEqual(await names('modified'), ['c.pdf', 'a.mp4', 'b.jpg', 'z.png']);
  assert.deepStrictEqual(await names('kind'), ['b.jpg', 'z.png', 'a.mp4', 'c.pdf']);
  for (const sort of ['name', 'modified', 'kind']) {
    assert.deepStrictEqual((await list(dir, false, sort)).folders.map((f) => f.name), ['alpha', 'zeta']);
  }
  const enumeration = core.registry.get('images.list').input.properties.sort;
  assert.deepStrictEqual(enumeration.enum, ['name', 'modified', 'kind']);
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

test('videos and PDFs can be named, copied and planned for the Trash like photos', async () => {
  const dir = temp();
  const video = touch(dir, 'clip.mp4', 'vv');
  const pdf = touch(dir, 'doc.PDF', 'ppp');
  assert.deepStrictEqual(files.requireImages([video, pdf]), [{ path: video, bytes: 2 }, { path: pdf, bytes: 3 }]);
  assert.throws(() => files.requireImages([touch(dir, 'a.txt')]), (err) => err.code === 'NOT_AN_IMAGE' && /photo, video or PDF/.test(err.message));

  const dest = temp();
  const { done } = await files.transfer(run, 'copy', [video, pdf], dest);
  assert.deepStrictEqual(done.map((d) => path.basename(d.to)), ['clip.mp4', 'doc.PDF']);
  const plan = await core.registry.get('images.trash').plan(run, { paths: [video, pdf] });
  assert.strictEqual(plan.bytes, 5);

  const selected = await core.registry.get('images.select').execute(run, { paths: [dir + '/nope.mp4'], off: true });
  assert.strictEqual(selected.selected >= 0, true);
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

// Many empty files are enough to count; the task only ever reads listings.
function fill(dir, n, name = (i) => `p${i}.jpg`) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i += 1) fs.writeFileSync(path.join(dir, name(i)), '');
}

test('counting finds photos, videos and PDFs at every depth and counts direct subfolders', async () => {
  const dir = temp();
  touch(dir, 'a/b/c/deep.jpg');
  touch(dir, 'a/clip.mov');
  touch(dir, 'doc.pdf');
  touch(dir, 'notes.txt');
  fs.mkdirSync(path.join(dir, 'empty'));

  const [result] = (await count([dir])).folders;
  assert.strictEqual(result.path, dir);
  assert.deepStrictEqual(
    { photos: result.photos, videos: result.videos, pdfs: result.pdfs, folders: result.folders, capped: result.capped, partial: result.partial },
    { photos: 1, videos: 1, pdfs: 1, folders: 2, capped: false, partial: false }
  );
});

test('counting skips hidden items and packages unless hidden is asked for', async () => {
  const dir = temp();
  touch(dir, 'a.jpg');
  touch(dir, '.hidden.jpg');
  touch(dir, '.secret/a.jpg');
  touch(dir, 'Library.photoslibrary/a.jpg');
  touch(dir, 'Thing.app/a.jpg');

  const [plain] = (await count([dir])).folders;
  assert.deepStrictEqual([plain.photos, plain.folders], [1, 0]);
  const [all] = (await count([dir], true)).folders;
  // A package stays out even when hidden items are shown.
  assert.deepStrictEqual([all.photos, all.folders], [3, 1]);
});

test('counting never follows a linked folder but counts a linked photo', async () => {
  const dir = temp();
  const real = touch(dir, 'real/a.jpg');
  fs.symlinkSync(path.join(dir, 'real'), path.join(dir, 'loop'));
  fs.symlinkSync(path.dirname(dir), path.join(dir, 'up'));
  fs.symlinkSync(real, path.join(dir, 'link.jpg'));

  const [result] = (await count([dir])).folders;
  assert.deepStrictEqual([result.photos, result.folders], [2, 1]);
});

test('counting stops at 1000 files and says so', async () => {
  const dir = temp();
  fill(path.join(dir, 'one'), 600);
  fill(path.join(dir, 'two'), 600, (i) => `v${i}.mp4`);

  const [result] = (await count([dir])).folders;
  assert.strictEqual(result.capped, true);
  assert.strictEqual(result.photos + result.videos + result.pdfs, 1000);
  assert.ok(result.previews.length <= 9);
});

test('counting reads down to depth 8 and no further', async () => {
  const dir = temp();
  const nest = (levels) => Array.from({ length: levels }, (_, i) => `d${i}`).join('/');
  touch(dir, `${nest(8)}/in.jpg`);
  touch(dir, `${nest(9)}/out.jpg`);

  const [result] = (await count([dir])).folders;
  assert.strictEqual(result.photos, 1);
  assert.strictEqual(result.partial, false);
});

test('counting picks previews from the files inside first, then subfolders breadth first', async () => {
  const dir = temp();
  touch(dir, 'IMG_10.jpg');
  touch(dir, 'IMG_2.jpg');
  touch(dir, 'b/z.jpg');
  touch(dir, 'a/deep/x.jpg');
  touch(dir, 'a/y.jpg');
  touch(dir, 'clip.mp4');

  const [result] = (await count([dir])).folders;
  const names = result.previews.map((p) => path.relative(dir, p));
  // Videos only fill in when there are too few photos, and then come after them.
  assert.deepStrictEqual(names, ['IMG_2.jpg', 'IMG_10.jpg', 'a/y.jpg', 'b/z.jpg', 'a/deep/x.jpg', 'clip.mp4']);
});

test('counting offers up to nine previews and prefers photos over videos', async () => {
  const dir = temp();
  fill(dir, 12);
  touch(dir, 'a.mp4');
  const [result] = (await count([dir])).folders;
  assert.strictEqual(result.previews.length, 9);
  assert.ok(result.previews.every((p) => p.endsWith('.jpg')));
});

test('counting reports a missing path or a file per entry without failing the call', async () => {
  const dir = temp();
  const file = touch(dir, 'a.jpg');
  touch(dir, 'ok/a.jpg');
  const result = await count([path.join(dir, 'nope'), file, path.join(dir, 'ok')]);
  assert.deepStrictEqual(result.folders[0], { path: path.join(dir, 'nope'), error: 'SRC_NOT_FOUND' });
  assert.deepStrictEqual(result.folders[1], { path: file, error: 'NOT_A_FOLDER' });
  assert.strictEqual(result.folders[2].photos, 1);
});

test('counting keeps an answer for a minute unless the folder changes', async () => {
  const dir = temp();
  touch(dir, 'a.jpg');
  fs.mkdirSync(path.join(dir, 'sub'));
  assert.strictEqual((await count([dir])).folders[0].photos, 1);

  // A file added in a nested folder does not touch the top folder's mtime, so
  // the remembered answer is returned.
  fs.writeFileSync(path.join(dir, 'sub', 'b.jpg'), '');
  assert.strictEqual((await count([dir])).folders[0].photos, 1);

  // A change that moves the folder's own mtime is counted again.
  fs.writeFileSync(path.join(dir, 'c.jpg'), '');
  fs.utimesSync(dir, new Date(), new Date(Date.now() + 5000));
  assert.strictEqual((await count([dir])).folders[0].photos, 3);
});

test('a count that runs out of time is partial and is not remembered', async () => {
  const dir = temp();
  touch(dir, 'a/a.jpg');
  const counting = require('../src/tasks/images/count');
  let tick = 0;
  // Each look at the clock is 1 second later, so the 1.5 second budget is
  // gone after the first folder.
  const result = await counting.walk(dir, false, () => (tick += 1000));
  assert.strictEqual(result.partial, true);
});

test('the default-app task lists the nine photo types and Turink Toys as the default', () => {
  const app = require('../src/tasks/images/default-app');
  assert.deepStrictEqual(app.UTIS, [
    'public.jpeg', 'public.png', 'public.heic', 'public.heif', 'public.tiff',
    'com.compuserve.gif', 'org.webmproject.webp', 'public.avif', 'com.microsoft.bmp',
  ]);
  assert.deepStrictEqual(app.TYPES.map((t) => t.name), ['JPEG', 'PNG', 'HEIC', 'HEIF', 'TIFF', 'GIF', 'WebP', 'AVIF', 'BMP']);
  assert.strictEqual(app.OUR_APP, 'toys.turink.app');
  const set = core.registry.get('images.set-default-app');
  assert.strictEqual(set.preference, true);
  assert.strictEqual(set.idempotent, true);
});

test('default-app status reads the system through the helper without changing it', { skip: !require('../src/tasks/images/default-app').helperAvailable() }, async () => {
  const result = await core.registry.get('images.default-app').execute(run, {});
  assert.strictEqual(result.app, 'toys.turink.app');
  assert.strictEqual(result.types.length, 9);
  for (const type of result.types) {
    assert.ok(type.handler === null || typeof type.handler === 'string');
    assert.strictEqual(type.ours, type.handler === 'toys.turink.app');
  }
  assert.strictEqual(result.allOurs, result.types.every((t) => t.ours));
});
