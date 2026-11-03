'use strict';

const path = require('path');

// What the viewer treats as a photo, grouped by how it reaches the screen. The
// group decides the work a front end has to do, so it is part of the table
// rather than something each caller works out again.
//
//   direct   the browser engine draws the file as it is
//   convert  macOS can decode it, but the engine cannot, so it is converted first
//   raw      a camera's unprocessed file, shown through macOS's embedded preview
const KINDS = {
  direct: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'],
  convert: ['heic', 'heif', 'tif', 'tiff'],
  raw: ['dng', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'raf', 'srw', 'pef'],
};

const BY_EXTENSION = new Map();
for (const [kind, extensions] of Object.entries(KINDS)) {
  for (const extension of extensions) BY_EXTENSION.set(extension, kind);
}

function extensionOf(file) {
  return path.extname(String(file)).slice(1).toLowerCase();
}

// Null for anything that is not a photo, so one call answers both questions.
function kindOf(file) {
  return BY_EXTENSION.get(extensionOf(file)) || null;
}

function isImage(file) {
  return kindOf(file) !== null;
}

// Finder orders "IMG_2" before "IMG_10" and ignores letter case, which plain
// code-point order does not.
function compareNames(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

module.exports = { KINDS, extensionOf, kindOf, isImage, compareNames };
