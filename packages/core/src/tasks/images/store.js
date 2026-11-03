'use strict';

const settings = require('../../kernel/settings');

// The photos a person has picked in the viewer, kept in the shared settings so
// the window and the command line see the same selection. Each entry is an
// absolute path; order is the order they were picked in.

const KEY = 'images.selected';

function load(storage = settings) {
  const list = storage.get(KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((entry) => typeof entry === 'string' && entry);
}

function save(list, storage = settings) {
  storage.set(KEY, list);
  return list;
}

// A moved file keeps its place in the selection under its new path, otherwise
// moving what was just picked would silently empty the selection.
function rewrite(list, moves) {
  const byOld = new Map(moves.map((move) => [move.from, move.to]));
  return list.map((entry) => byOld.get(entry) || entry);
}

// Adds, removes or clears. Paths that no longer exist are dropped only when the
// list is changing anyway, so a read never rewrites the person's selection and
// a vanished file is not forgotten behind their back. Returns the paths whose
// membership changed; an empty list means nothing needs saving.
function change(list, { paths = [], off = false, clear = false }, exists) {
  if (clear) return { list: [], changed: [...list] };

  const changed = off ? paths.filter((entry) => list.includes(entry)) : paths.filter((entry) => !list.includes(entry));
  if (changed.length === 0) return { list, changed };

  const next = off ? list.filter((entry) => !changed.includes(entry)) : [...list, ...changed];
  return { list: next.filter(exists), changed };
}

module.exports = { KEY, load, save, rewrite, change };
