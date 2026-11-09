'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const settings = require('../../kernel/settings');
const { fail } = require('../../kernel/errors');

// The folders a person opens often, kept in the shared settings so the
// window, the menu bar and the command line read the same list. Order is the
// person's own; nothing here sorts it.
//
// Each entry is { path, name?, group? }. A name is stored only when the person
// chose one, so a folder renamed on disk still shows its new name by default.
// Groups are optional: an entry without one sits in the ungrouped section, and
// within each section entries keep their order in the one list. The group
// order lives beside it, so a group can exist before any folder is in it.

const KEY = 'folders';
const GROUPS_KEY = 'folderGroups';

function load(storage = settings) {
  const list = storage.get(KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((entry) => entry && typeof entry.path === 'string');
}

// Entries naming a group missing from the order, say after a hand edit of
// the settings file, put that group back at the end rather than hiding it.
function loadGroups(list, storage = settings) {
  const stored = storage.get(GROUPS_KEY, []);
  const groups = Array.isArray(stored) ? stored.filter((name) => typeof name === 'string' && name.trim()) : [];
  for (const entry of list) {
    if (entry.group && !groups.includes(entry.group)) groups.push(entry.group);
  }
  return groups;
}

function compact(entry) {
  const out = { path: entry.path };
  if (entry.name) out.name = entry.name;
  if (entry.group) out.group = entry.group;
  return out;
}

function save(list, storage = settings) {
  storage.set(KEY, list.map(compact));
  return list;
}

function saveGroups(groups, storage = settings) {
  storage.set(GROUPS_KEY, groups);
  return groups;
}

// A trailing slash or a "~" must not make the same folder look like two.
function normalize(target, home = os.homedir()) {
  let value = String(target || '').trim();
  if (value === '~') value = home;
  else if (value.startsWith('~/')) value = path.join(home, value.slice(2));
  return path.resolve(value);
}

function indexOf(list, target, home) {
  const wanted = normalize(target, home);
  return list.findIndex((entry) => entry.path === wanted);
}

function requireIndex(list, target, home) {
  const index = indexOf(list, target, home);
  if (index === -1) {
    fail('SRC_NOT_FOUND', `"${normalize(target, home)}" is not in the folder list.`, {
      hint: 'Run "turink-toys folders.list --json" to see the saved paths.',
    });
  }
  return index;
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function add(list, target, name, home, group) {
  const resolved = normalize(target, home);
  if (!fs.existsSync(resolved)) {
    fail('SRC_NOT_FOUND', `There is no folder at ${resolved}.`, { hint: 'Check the path and try again.' });
  }
  if (!isDirectory(resolved)) {
    fail('INVALID_INPUT', `${resolved} is a file, not a folder.`, { hint: 'Only folders can be added.' });
  }
  const existing = indexOf(list, resolved, home);
  if (existing !== -1) return { list, added: false, index: existing };
  const entry = compact({ path: resolved, name: name && name.trim(), group });
  return { list: [...list, entry], added: true, index: list.length };
}

function remove(list, target, home) {
  const index = requireIndex(list, target, home);
  return { list: list.filter((_, i) => i !== index), removed: list[index] };
}

// Moves an entry within its section, or into another one. Position is 1-based
// within the section because that is how a person counts what they see. A
// number past either end lands at that end rather than failing.
//
// group: undefined keeps the entry's section, null moves it out of any group,
// a name moves it into that group.
function reorder(list, target, position, home, group) {
  const from = requireIndex(list, target, home);
  const next = [...list];
  const [taken] = next.splice(from, 1);
  const section = group === undefined ? taken.group || null : group;
  const entry = compact({ ...taken, group: section });

  const members = next.map((item, index) => ({ item, index })).filter(({ item }) => (item.group || null) === section);
  const to = Math.min(Math.max(Math.round(position) - 1, 0), members.length);
  let at;
  if (members.length === 0) at = next.length;
  else if (to < members.length) at = members[to].index;
  else at = members[members.length - 1].index + 1;
  next.splice(at, 0, entry);
  return { list: next, position: to + 1 };
}

// An empty name hands the entry back to the folder's own name.
function rename(list, target, name, home) {
  const index = requireIndex(list, target, home);
  const next = [...list];
  next[index] = compact({ ...next[index], name: (name || '').trim() });
  return { list: next, entry: next[index] };
}

// ------------------------------------------------------------- groups

function groupIndex(groups, name) {
  const wanted = String(name || '').trim().toLocaleLowerCase();
  return groups.findIndex((group) => group.toLocaleLowerCase() === wanted);
}

function requireGroup(groups, name) {
  const index = groupIndex(groups, name);
  if (index === -1) {
    fail('SRC_NOT_FOUND', `There is no group named "${name}".`, {
      hint: 'Run "turink-toys folders.list --json" to see the groups.',
    });
  }
  return index;
}

function cleanGroupName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) fail('INVALID_INPUT', 'A group needs a name.', { hint: 'Give the group a name and try again.' });
  return trimmed;
}

// A group named like an existing one, ignoring letter case, is refused so the
// menu never shows two headings a person cannot tell apart.
function addGroup(groups, name, position) {
  const clean = cleanGroupName(name);
  if (groupIndex(groups, clean) !== -1) {
    fail('DEST_EXISTS', `A group named "${clean}" already exists.`, { hint: 'Choose another name.' });
  }
  const next = [...groups];
  const at = position === undefined ? next.length : Math.min(Math.max(Math.round(position) - 1, 0), next.length);
  next.splice(at, 0, clean);
  return { groups: next, name: clean };
}

// Returns the stored spelling, so a name typed in another letter case still
// finds the group.
function findGroup(groups, name) {
  return groups[requireGroup(groups, name)];
}

function renameGroup(list, groups, from, to) {
  const index = requireGroup(groups, from);
  const old = groups[index];
  const clean = cleanGroupName(to);
  const clash = groupIndex(groups, clean);
  if (clash !== -1 && clash !== index) {
    fail('DEST_EXISTS', `A group named "${clean}" already exists.`, { hint: 'Choose another name.' });
  }
  const nextGroups = [...groups];
  nextGroups[index] = clean;
  const nextList = list.map((entry) => (entry.group === old ? compact({ ...entry, group: clean }) : entry));
  return { list: nextList, groups: nextGroups, name: clean };
}

// Removing a group never removes a folder: its folders join the end of the
// ungrouped section in the order they had.
function removeGroup(list, groups, name) {
  const index = requireGroup(groups, name);
  const old = groups[index];
  const kept = list.filter((entry) => entry.group !== old);
  const released = list.filter((entry) => entry.group === old).map((entry) => compact({ ...entry, group: null }));
  return { list: [...kept, ...released], groups: groups.filter((_, i) => i !== index), name: old, released: released.length };
}

function reorderGroup(groups, name, position) {
  const from = requireGroup(groups, name);
  const next = [...groups];
  const [taken] = next.splice(from, 1);
  const to = Math.min(Math.max(Math.round(position) - 1, 0), next.length);
  next.splice(to, 0, taken);
  return { groups: next, position: to + 1 };
}

// Where a folder lives, named the way a person thinks of it: a well-known
// place (Desktop, OneDrive, an external disk) followed by the folders between
// that place and this one.
function locate(target, home = os.homedir()) {
  const relativeTo = (root) => {
    if (target === root) return [];
    if (target.startsWith(root + path.sep)) return target.slice(root.length + 1).split(path.sep);
    return null;
  };

  const volume = /^\/Volumes\/([^/]+)(?:\/(.*))?$/.exec(target);
  if (volume) {
    return { source: 'volume', place: volume[1], parts: volume[2] ? volume[2].split('/') : [] };
  }

  const cloud = path.join(home, 'Library', 'CloudStorage');
  const inCloud = relativeTo(cloud);
  if (inCloud && inCloud.length > 0) {
    const provider = inCloud[0];
    const source = /^OneDrive/i.test(provider)
      ? 'onedrive'
      : /^GoogleDrive/i.test(provider)
        ? 'gdrive'
        : /^Dropbox/i.test(provider)
          ? 'dropbox'
          : 'cloud';
    return { source, place: provider, parts: inCloud.slice(1) };
  }

  const known = [
    ['icloud', path.join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs')],
    ['onedrive', path.join(home, 'OneDrive')],
    ['desktop', path.join(home, 'Desktop')],
    ['documents', path.join(home, 'Documents')],
    ['downloads', path.join(home, 'Downloads')],
  ];
  for (const [source, root] of known) {
    const parts = relativeTo(root);
    if (parts) return { source, place: path.basename(root), parts };
  }

  const inHome = relativeTo(home);
  if (inHome) return { source: 'home', place: path.basename(home), parts: inHome };
  return { source: 'disk', place: '/', parts: target.split(path.sep).filter(Boolean) };
}

// The list as every front end shows it. When two entries would show the same
// folder name, each says what tells it apart: the place when the places
// differ, otherwise the folder that contains it.
function describe(list, home = os.homedir()) {
  const items = list.map((entry) => {
    let where = locate(entry.path, home);
    const folderName = path.basename(entry.path) || entry.path;
    // The folders from the place down to this one, the folder itself last, so
    // the real folder stays visible when the entry is shown under another name.
    let trail = where.parts;
    // A saved folder that is itself a well-known place, such as Downloads, is
    // located by what contains it, so it does not read as "Downloads in
    // Downloads". A disk is the place a person thinks of, so it stays as is.
    if (where.parts.length === 0 && where.source !== 'volume' && where.source !== 'disk') {
      where = locate(path.dirname(entry.path), home);
      trail = [...where.parts, folderName];
    }
    // The folders between the place and this one, without the folder itself.
    const parents = trail.slice(0, -1);
    return {
      path: entry.path,
      name: entry.name || folderName,
      customName: Boolean(entry.name),
      folderName,
      source: where.source,
      place: where.place,
      parents,
      trail,
      group: entry.group || null,
      available: isDirectory(entry.path),
      clash: null,
    };
  });

  // A name the person chose is theirs to keep as it is; only folders shown
  // under their own name are told apart.
  const groups = new Map();
  for (const item of items) {
    if (item.customName) continue;
    const key = item.name.toLocaleLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const places = new Set(group.map((item) => `${item.source}:${item.place}`));
    for (const item of group) {
      if (places.size === group.length) item.clash = 'place';
      else item.clash = 'parent';
    }
  }
  return items;
}

// What every task hands back after a change: the list as folders.list reports
// it and the groups in order with how many folders each holds.
function snapshot(list, groups, home = os.homedir()) {
  return {
    folders: describe(list, home),
    groups: groups.map((name) => ({ name, count: list.filter((entry) => entry.group === name).length })),
  };
}

module.exports = {
  KEY,
  GROUPS_KEY,
  load,
  loadGroups,
  save,
  saveGroups,
  normalize,
  add,
  remove,
  reorder,
  rename,
  addGroup,
  findGroup,
  renameGroup,
  removeGroup,
  reorderGroup,
  locate,
  describe,
  snapshot,
};
