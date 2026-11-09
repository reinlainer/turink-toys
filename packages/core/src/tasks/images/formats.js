'use strict';

const path = require('path');

// What the viewer treats as a photo, grouped by how it reaches the screen. The
// group decides the work a front end has to do, so it is part of the table
// rather than something each caller works out again.
//
//   direct   the browser engine draws the file as it is
//   convert  macOS can decode it, but the engine cannot, so it is converted first
//   raw      a camera's unprocessed file, shown through macOS's embedded preview
//
// Videos and PDFs are browsed and filed alongside photos but are not photos:
// they are listed under their own kinds so a front end never tries to convert
// them as pictures.
const KINDS = {
  direct: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'],
  convert: ['heic', 'heif', 'tif', 'tiff'],
  raw: ['dng', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'raf', 'srw', 'pef'],
  video: ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'],
  pdf: ['pdf'],
};

const PHOTO_KINDS = ['direct', 'convert', 'raw'];

const BY_EXTENSION = new Map();
for (const [kind, extensions] of Object.entries(KINDS)) {
  for (const extension of extensions) BY_EXTENSION.set(extension, kind);
}

function extensionOf(file) {
  return path.extname(String(file)).slice(1).toLowerCase();
}

// How a file reaches the screen: direct, convert, raw, video or pdf. Null for
// anything the viewer does not show, so one call answers both questions.
function kindOf(file) {
  return BY_EXTENSION.get(extensionOf(file)) || null;
}

// The coarse group a person thinks in: photo, video or pdf.
function typeOf(file) {
  const kind = kindOf(file);
  if (kind === null) return null;
  return PHOTO_KINDS.includes(kind) ? 'photo' : kind;
}

// Photos only. The app uses this to decide whether a file needs converting to
// be drawn, which is meaningless for a video or a PDF.
function isImage(file) {
  return typeOf(file) === 'photo';
}

// Anything the viewer lists and the file tasks accept.
function isMedia(file) {
  return typeOf(file) !== null;
}

// Finder orders "IMG_2" before "IMG_10" and ignores letter case, which plain
// code-point order does not.
function compareNames(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

module.exports = { KINDS, extensionOf, kindOf, typeOf, isImage, isMedia, compareNames };
