'use strict';

const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');
const { fail } = require('../../kernel/errors');
const { detect, decode, isAsciiOnly } = require('./encoding');
const { isEscaping } = require('./names');

// Shared reader for the three tasks that open an archive. Entries are read with
// decodeStrings disabled so the raw name bytes stay available, which is the only
// way to recover a name written in a legacy code page.

function openArchive(file) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    fail('SRC_NOT_FOUND', `Cannot find "${file}".`, { hint: 'Check the path to the archive.' });
  }
  // autoClose would release the file handle as soon as the last entry is read,
  // which leaves the archive unusable for the extraction that follows. Closing
  // is left to the caller instead.
  return new Promise((resolve, reject) => {
    yauzl.open(resolved, { decodeStrings: false, lazyEntries: true, autoClose: false }, (err, zip) => {
      if (err) {
        reject(
          Object.assign(new Error(`"${file}" is not a readable zip archive.`), {
            code: 'NOT_AN_ARCHIVE',
          })
        );
        return;
      }
      resolve(zip);
    });
  });
}

function readEntries(zip) {
  return new Promise((resolve, reject) => {
    const entries = [];
    zip.on('error', reject);
    zip.on('entry', (entry) => {
      entries.push({
        rawName: Buffer.from(entry.fileName),
        flags: entry.generalPurposeBitFlag,
        utf8: (entry.generalPurposeBitFlag & 0x800) !== 0,
        size: entry.uncompressedSize,
        compressed: entry.compressedSize,
        crc32: entry.crc32,
        raw: entry,
      });
      zip.readEntry();
    });
    zip.on('end', () => resolve(entries));
    zip.readEntry();
  });
}

async function inspect(file) {
  const zip = await openArchive(file);
  const entries = await readEntries(zip);

  const nonAscii = entries.filter((e) => !isAsciiOnly(e.rawName));
  const flagged = entries.filter((e) => e.utf8);
  const needsGuess = nonAscii.filter((e) => !e.utf8);

  let encodings = [];
  if (needsGuess.length > 0) {
    encodings = detect(needsGuess.map((e) => e.rawName));
  }

  return { zip, entries, nonAscii, flagged, needsGuess, encodings };
}

// Applies one encoding to every entry and returns names normalised to NFC,
// which is the form Windows and the Finder both display consistently.
function resolveNames(entries, encoding) {
  return entries.map((entry) => {
    const name = entry.utf8
      ? decode(entry.rawName, 'utf-8')
      : decode(entry.rawName, isAsciiOnly(entry.rawName) ? 'utf-8' : encoding);
    return {
      ...entry,
      name: (name || '').normalize('NFC'),
      isDirectory: (name || '').endsWith('/'),
      escaping: isEscaping(name || ''),
    };
  });
}

module.exports = { openArchive, readEntries, inspect, resolveNames };
