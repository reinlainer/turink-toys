'use strict';

const fs = require('fs');
const path = require('path');
const { fail } = require('../../kernel/errors');
const { normalize } = require('../folders/store');
const { isMedia } = require('./formats');
const store = require('./store');

// Checks and file operations shared by the tasks that read, copy, move or
// trash photos. Every check runs before the first file is touched, so a bad
// path in a long list stops the run instead of leaving it half done.

function statOrNull(target) {
  try {
    return fs.statSync(target);
  } catch {
    return null;
  }
}

// A package is a folder Finder shows as one file. Browsing into one would show
// the inside of an app or a photo library, which a person never meant to open.
const PACKAGE_EXTENSIONS = ['.app', '.photoslibrary', '.bundle', '.framework', '.plugin', '.pkg'];

function isPackage(name) {
  const lower = name.toLowerCase();
  return PACKAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function visible(name, hidden) {
  return hidden || !name.startsWith('.');
}

function requireFolder(target) {
  const resolved = normalize(target);
  const stat = statOrNull(resolved);
  if (!stat) {
    fail('SRC_NOT_FOUND', `There is no folder at ${resolved}.`, { hint: 'Check the path and try again.' });
  }
  if (!stat.isDirectory()) {
    fail('NOT_A_FOLDER', `${resolved} is a file, not a folder.`, { hint: 'Give the folder that holds the files.' });
  }
  return resolved;
}

// A path named twice counts once, so a list assembled from several selections
// cannot copy or trash the same file twice. Despite the name, videos and PDFs
// pass too: the viewer shows them next to photos and files them the same way.
function requireImages(targets) {
  const seen = new Set();
  const found = [];
  for (const raw of targets) {
    const resolved = normalize(raw);
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    const stat = statOrNull(resolved);
    if (!stat) {
      fail('SRC_NOT_FOUND', `There is no file at ${resolved}.`, { hint: 'Check the path and try again.' });
    }
    if (!stat.isFile() || !isMedia(resolved)) {
      fail('NOT_AN_IMAGE', `${resolved} is not a photo, video or PDF this tool handles.`, {
        hint: 'Only photos (jpg, png, heic, RAW and the like), videos and PDFs can be used.',
      });
    }
    found.push({ path: resolved, bytes: stat.size });
  }
  return found;
}

// "name.jpg", then "name 2.jpg", "name 3.jpg" as Finder does. The folder is
// read each time rather than once, because files placed earlier in the same
// run take names too.
function uniqueName(folder, name) {
  const extension = path.extname(name);
  const stem = name.slice(0, name.length - extension.length);
  let candidate = name;
  for (let n = 2; fs.existsSync(path.join(folder, candidate)); n += 1) candidate = `${stem} ${n}${extension}`;
  return candidate;
}

// COPYFILE_EXCL refuses to overwrite, so a file that appears between choosing
// the name and writing it is never lost; the next free name is tried instead.
// The modification date is carried over because a copy that looks newer than
// its original reorders the person's library.
async function copyInto(source, folder) {
  const stat = fs.statSync(source);
  for (;;) {
    const target = path.join(folder, uniqueName(folder, path.basename(source)));
    try {
      await fs.promises.copyFile(source, target, fs.constants.COPYFILE_EXCL);
    } catch (err) {
      if (err.code === 'EEXIST') continue;
      throw err;
    }
    await fs.promises.utimes(target, stat.atime, stat.mtime);
    return target;
  }
}

// A rename inside one volume keeps the file as it is. Across volumes it fails
// with EXDEV, and the file is copied and then removed. If the original cannot
// be removed the copy is withdrawn, so a failed move never leaves two files.
async function moveInto(source, folder) {
  if (path.dirname(source) === folder) return source;
  const target = path.join(folder, uniqueName(folder, path.basename(source)));
  try {
    await fs.promises.rename(source, target);
    return target;
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
  }
  const copy = await copyInto(source, folder);
  try {
    await fs.promises.unlink(source);
  } catch (err) {
    await fs.promises.rm(copy, { force: true });
    throw err;
  }
  return copy;
}

// Shared by images.copy and images.move. Individual failures are collected and
// reported rather than ending the run, since the rest of the list is still
// worth doing.
async function transfer(run, mode, paths, to, storage) {
  const folder = requireFolder(to);
  const sources = requireImages(paths);
  const done = [];
  const failed = [];

  for (const [index, source] of sources.entries()) {
    run.progress(index + 1, sources.length, source.path, 'path');
    try {
      const target = mode === 'move' ? await moveInto(source.path, folder) : await copyInto(source.path, folder);
      done.push({ from: source.path, to: target });
    } catch (err) {
      failed.push({ path: source.path, message: err.message });
      run.warn(mode === 'move' ? 'MOVE_FAILED' : 'COPY_FAILED', { path: source.path, message: err.message });
    }
  }

  if (mode === 'move') {
    const list = store.load(storage);
    const next = store.rewrite(list, done);
    if (next.some((entry, i) => entry !== list[i])) store.save(next, storage);
  }
  return { folder, done, failed };
}

module.exports = { PACKAGE_EXTENSIONS, isPackage, visible, statOrNull, requireFolder, requireImages, uniqueName, copyInto, moveInto, transfer };
