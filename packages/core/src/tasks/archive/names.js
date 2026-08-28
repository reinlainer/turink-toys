'use strict';

const path = require('path');

// Windows rejects characters that macOS accepts, so an archive built on macOS
// can carry names that fail to extract on the very system it is meant for.
// Sanitising here is what makes the archive safe rather than merely well
// encoded.

const ILLEGAL = /[:\\?*"<>|]/g;
const RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

function sanitizeSegment(segment) {
  let out = segment.replace(ILLEGAL, '_');

  // Windows silently strips a trailing dot or space, which turns two distinct
  // names into one. Replacing the character keeps them distinct.
  out = out.replace(/[. ]+$/, (match) => '_'.repeat(match.length));

  const stem = out.split('.')[0].toUpperCase();
  if (RESERVED.has(stem)) out = '_' + out;

  return out;
}

// Returns the archive-safe name plus the segments that had to change, so the
// caller can report every substitution rather than renaming silently.
function sanitizePath(relPath) {
  const segments = relPath.split('/');
  const changes = [];
  const safe = segments.map((segment) => {
    const cleaned = sanitizeSegment(segment);
    if (cleaned !== segment) changes.push({ from: segment, to: cleaned });
    return cleaned;
  });
  return { path: safe.join('/'), changes };
}

// Extraction must not write outside the destination. An entry naming an
// absolute path or climbing with ".." is rejected rather than clamped, because
// a clamped name is no longer the name the archive declared.
function isEscaping(entryName) {
  if (path.isAbsolute(entryName)) return true;
  if (entryName.includes('\\')) return true;
  const normalized = path.normalize(entryName);
  return normalized === '..' || normalized.startsWith('..' + path.sep);
}

module.exports = { sanitizePath, sanitizeSegment, isEscaping, ILLEGAL, RESERVED };
