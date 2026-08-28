'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yauzl = require('yauzl');

require('../src/index');
const { runTask } = require('../src/kernel/execute');
const { sanitizePath, isEscaping } = require('../src/tasks/archive/names');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'turink-test-'));
}

function readEntries(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { decodeStrings: false, lazyEntries: true, autoClose: false }, (err, zip) => {
      if (err) return reject(err);
      const entries = [];
      zip.on('entry', (entry) => {
        entries.push({
          name: Buffer.from(entry.fileName).toString('utf8'),
          utf8: (entry.generalPurposeBitFlag & 0x800) !== 0,
        });
        zip.readEntry();
      });
      zip.on('end', () => {
        zip.close();
        resolve(entries);
      });
      zip.readEntry();
    });
  });
}

// Fixture names are written as escape sequences so this source file stays pure
// ASCII and does not depend on its own encoding being handled correctly.
// The tool claims to serve several legacy code pages, so the cases cover more
// than one script rather than the one that motivated the work.
const SCRIPTS = [
  { label: 'Hangul', name: '\uD55C\uAE00.txt' },
  { label: 'Kana', name: '\u30C6\u30B9\u30C8.txt' },
  { label: 'Han', name: '\u6587\u4EF6.txt' },
  { label: 'Cyrillic', name: '\u0444\u0430\u0439\u043B.txt' },
  { label: 'Emoji outside the basic plane', name: '\uD83D\uDCC1.txt' },
];

// "e" followed by a combining acute accent. macOS stores names this way while
// Windows expects the single composed character.
const DECOMPOSED_NAME = 'e\u0301te.txt';

for (const script of SCRIPTS) {
  test(`a name in ${script.label} carries the UTF-8 flag`, async () => {
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, 'source'));
    fs.writeFileSync(path.join(dir, 'source', script.name), 'x');

    const out = path.join(dir, 'out.zip');
    await runTask('archive.compress', { targets: [path.join(dir, 'source')], output: out });

    const entries = await readEntries(out);
    const entry = entries.find((e) => e.name.includes(script.name));
    assert.ok(entry, 'the non-ASCII entry should be present');
    assert.equal(entry.utf8, true, 'the UTF-8 flag decides how Windows reads the name');
  });
}

test('decomposed names are stored in composed form', async () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, 'source'));
  fs.writeFileSync(path.join(dir, 'source', DECOMPOSED_NAME), 'x');

  const out = path.join(dir, 'out.zip');
  await runTask('archive.compress', { targets: [path.join(dir, 'source')], output: out });

  const entries = await readEntries(out);
  const entry = entries.find((e) => e.name.endsWith('.txt'));
  assert.equal(
    entry.name.normalize('NFC'),
    entry.name,
    'Windows shows separated marks unless the name is composed'
  );
});

test('an empty directory survives the round trip', async () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, 'source', 'empty'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'source', 'file.txt'), 'x');

  const out = path.join(dir, 'out.zip');
  await runTask('archive.compress', { targets: [path.join(dir, 'source')], output: out });

  const entries = await readEntries(out);
  assert.ok(
    entries.some((e) => e.name.endsWith('empty/')),
    'an empty directory is lost unless recorded as its own entry'
  );
});

test('a second target is never treated as the output path', async () => {
  const dir = tempDir();
  const a = path.join(dir, 'a.txt');
  const b = path.join(dir, 'b.txt');
  fs.writeFileSync(a, 'first');
  fs.writeFileSync(b, 'second');

  await runTask('archive.compress', { targets: [a, b] });

  assert.equal(fs.readFileSync(b, 'utf8'), 'second', 'the second target must stay intact');
});

test('an existing archive is not overwritten', async () => {
  const dir = tempDir();
  const source = path.join(dir, 'a.txt');
  fs.writeFileSync(source, 'x');
  const out = path.join(dir, 'out.zip');
  fs.writeFileSync(out, 'existing');

  const outcome = await runTask('archive.compress', { targets: [source], output: out });

  assert.equal(fs.readFileSync(out, 'utf8'), 'existing');
  assert.notEqual(outcome.result.archives[0].output, out);
});

test('characters Windows rejects are substituted and reported', () => {
  const result = sanitizePath('folder/a:b?c.txt');
  assert.equal(result.path, 'folder/a_b_c.txt');
  assert.equal(result.changes.length, 1);
});

test('a trailing dot is replaced rather than dropped', () => {
  assert.equal(sanitizePath('name.').path, 'name_');
});

test('entries pointing outside the destination are recognised', () => {
  assert.equal(isEscaping('../escape.txt'), true);
  assert.equal(isEscaping('/etc/passwd'), true);
  assert.equal(isEscaping('safe/path.txt'), false);
});
