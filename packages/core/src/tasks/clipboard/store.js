'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { dirs } = require('../../kernel/paths');
const { fail } = require('../../kernel/errors');
const settings = require('../../kernel/settings');

const run = promisify(execFile);

// Images that passed through the clipboard are kept in one folder of this
// tool's own. Nothing is ever removed from it on a timer: what is older than a
// day is only shown apart, and the person removes what they no longer want.
//
// Reading and writing the clipboard goes through a native helper, which is
// also what the window runs in the background to collect new images.

const HELPER = require('../../../native/helpers').helper('clipboard');
const FOLDER = path.join(dirs.support, 'clipboard');
const SETTING = 'clipboard.collect';
const RECENT_MS = 24 * 60 * 60 * 1000;

// The names the helper gives: <yyyyMMdd-HHmmss>-<hash>.<ext>.
const NAME = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-[0-9a-f]{12}\.(png|jpg)$/;

function collecting(storage = settings) {
  return storage.get(SETTING, false) === true;
}

function setCollecting(on, storage = settings) {
  return storage.set(SETTING, Boolean(on));
}

// The time an image was kept, read from its name so that copying the folder
// elsewhere or touching a file does not reorder the gallery. A file put there
// by hand falls back to its modification time.
function savedAt(name, stat) {
  const match = NAME.exec(name);
  if (!match) return stat.mtime;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  return new Date(y, mo - 1, d, h, mi, s);
}

// Newest first, split at a day before `now`.
async function listKept(folder = FOLDER, now = Date.now()) {
  let names = [];
  try {
    names = await fs.promises.readdir(folder);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const images = [];
  for (const name of names) {
    if (!/\.(png|jpe?g)$/i.test(name) || name.startsWith('.')) continue;
    const file = path.join(folder, name);
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) continue;
      const saved = savedAt(name, stat);
      images.push({ name, path: file, bytes: stat.size, saved: saved.toISOString(), type: 'photo' });
    } catch {
      // Removed while the folder was being read.
    }
  }
  images.sort((a, b) => Date.parse(b.saved) - Date.parse(a.saved) || b.name.localeCompare(a.name));
  const cutoff = now - RECENT_MS;
  return {
    recent: images.filter((image) => Date.parse(image.saved) >= cutoff),
    older: images.filter((image) => Date.parse(image.saved) < cutoff),
  };
}

// Only files inside the folder are handed to the helper, so a caller cannot
// use the clipboard tasks to read arbitrary files.
function requireKept(paths, folder = FOLDER) {
  return paths.map((entry) => {
    const file = path.resolve(String(entry).replace(/^~(?=$|\/)/, dirs.home));
    if (path.dirname(file) !== folder || !/\.(png|jpe?g)$/i.test(file)) {
      fail('NOT_KEPT', `Not an image in the clipboard gallery: ${file}`, {
        hint: 'Use paths reported by clipboard.list.',
      });
    }
    if (!fs.existsSync(file)) {
      fail('SRC_NOT_FOUND', `The image is no longer in the clipboard gallery: ${file}`, {
        hint: 'Run clipboard.list for the current images.',
      });
    }
    return file;
  });
}

async function helper(args) {
  try {
    const { stdout } = await run(HELPER.binary, args, { timeout: 30 * 1000, maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout.trim().split('\n').pop());
  } catch (err) {
    if (err.code === 'ENOENT') {
      fail('HELPER_MISSING', 'The clipboard helper is not part of this build.', {
        hint: 'In a source checkout, run "npm run helpers" and try again. A release build always includes it.',
      });
    }
    // The helper exits non-zero after printing why, when it can.
    try {
      return JSON.parse(String(err.stdout || '').trim().split('\n').pop());
    } catch {
      throw err;
    }
  }
}

module.exports = {
  HELPER,
  FOLDER,
  SETTING,
  RECENT_MS,
  collecting,
  setCollecting,
  listKept,
  requireKept,
  helper,
  savedAt,
};
