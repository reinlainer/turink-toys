'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { HOME, APP_ROOTS } = require('../../kernel/paths');
const { directorySize } = require('../disk/scan');

const exec = promisify(execFile);

const LIBRARY = path.join(HOME, 'Library');

// Release and development builds of this tool both start with this identifier.
const SELF_ID = 'toys.turink.app';

// ---------------------------------------------------------------------------
// Discovery

// Info.plist may be binary, and converting it to JSON fails on the date and
// data values some applications carry. XML always converts, and the handful of
// top-level strings needed here are easy to read out of it.
async function readInfo(appPath) {
  const plist = path.join(appPath, 'Contents', 'Info.plist');
  try {
    const { stdout } = await exec('/usr/bin/plutil', ['-convert', 'xml1', '-o', '-', plist]);
    return {
      bundleId: plistString(stdout, 'CFBundleIdentifier'),
      displayName: plistString(stdout, 'CFBundleDisplayName'),
      bundleName: plistString(stdout, 'CFBundleName'),
      executable: plistString(stdout, 'CFBundleExecutable'),
      version: plistString(stdout, 'CFBundleShortVersionString'),
    };
  } catch {
    return {};
  }
}

function plistString(xml, key) {
  const match = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  if (!match) return null;
  return match[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim() || null;
}

function isRealDirectory(full) {
  try {
    const stat = fs.lstatSync(full);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

// Bundles sit directly in an applications folder or one folder down, where
// vendors group a suite. Links are skipped: the system places some of its own
// applications there as links into the sealed volume.
function bundlePaths() {
  const found = [];
  for (const root of APP_ROOTS) {
    let names;
    try {
      names = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name.startsWith('.')) continue;
      const full = path.join(root, name);
      if (!isRealDirectory(full)) continue;
      if (name.endsWith('.app')) {
        found.push(full);
        continue;
      }
      let inner;
      try {
        inner = fs.readdirSync(full);
      } catch {
        continue;
      }
      for (const child of inner) {
        const nested = path.join(full, child);
        if (child.endsWith('.app') && isRealDirectory(nested)) found.push(nested);
      }
    }
  }
  return found;
}

// Removing what the system ships breaks the system, and removing this tool
// from inside itself leaves nothing to restore with. What the system ships is
// told by the System Integrity Protection flag rather than by an Apple bundle
// identifier, because Apple also publishes applications people install and
// remove themselves, Xcode being the largest of them.
function protection(bundleId, flags) {
  if (flags.split(',').includes('restricted')) return 'system';
  if (bundleId && (bundleId === SELF_ID || bundleId.startsWith(SELF_ID + '.'))) return 'self';
  return null;
}

// Node does not expose file flags, so they are read for every bundle in one
// call. A bundle whose flags cannot be read is treated as unflagged, which the
// Finder move would then refuse on its own if it really were protected.
async function fileFlags(paths) {
  if (paths.length === 0) return [];
  try {
    const { stdout } = await exec('/usr/bin/stat', ['-f', '%Sf', ...paths]);
    const lines = stdout.split('\n');
    return paths.map((_, index) => (lines[index] || '').trim());
  } catch {
    return paths.map(() => '');
  }
}

// The executable path of every process. An application counts as running when
// one of them lives inside its bundle, which also catches helper processes.
async function runningExecutables() {
  try {
    const { stdout } = await exec('/bin/ps', ['-axo', 'comm='], { maxBuffer: 8 * 1024 * 1024 });
    return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Extensions under Contents/PlugIns, such as widgets, are launched by macOS
// rather than by the application and keep running after it quits. Counting
// them would report an application as running that nobody can quit.
function isOwnProcess(exe, appPath) {
  if (!exe.startsWith(appPath + '/')) return false;
  return !exe.startsWith(path.join(appPath, 'Contents', 'PlugIns') + '/');
}

async function listApps() {
  const paths = bundlePaths();
  const [infos, running, flags] = await Promise.all([
    Promise.all(paths.map(readInfo)),
    runningExecutables(),
    fileFlags(paths),
  ]);

  return paths
    .map((appPath, index) => {
      const info = infos[index];
      const fallbackName = path.basename(appPath, '.app');
      return {
        name: info.displayName || info.bundleName || fallbackName,
        bundleId: info.bundleId || null,
        version: info.version || null,
        executable: info.executable || null,
        names: unique([info.displayName, info.bundleName, info.executable, fallbackName]),
        path: appPath,
        running: running.some((exe) => isOwnProcess(exe, appPath)),
        protected: protection(info.bundleId, flags[index]),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Leftovers

// Where applications keep per-user data, each named after the bundle
// identifier. Group Containers are left out on purpose: they are shared by a
// vendor's applications, so removing one would break the others.
const ID_FOLDERS = [
  'Application Support',
  'Caches',
  'Containers',
  'Cookies',
  'HTTPStorages',
  'LaunchAgents',
  'Logs',
  'Preferences',
  'Preferences/ByHost',
  'Saved Application State',
  'WebKit',
];

// Folders where cross-platform applications use their name instead of an
// identifier. Matching by name is less certain, so only these are searched
// that way and the plan says so.
const NAME_FOLDERS = ['Application Support', 'Caches', 'Logs'];

const SUFFIXES = ['.plist', '.savedState', '.binarycookies'];
const BYHOST_UUID = /\.[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

// The basis says how sure the match is. "bundle-id" is the identifier itself,
// "related" is a component named under it (an installer, a helper) and "name"
// is a folder that only shares the application's name.
function classify(entry, folder, app, others) {
  let stem = entry;
  for (const suffix of SUFFIXES) {
    if (stem.endsWith(suffix)) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }
  if (folder === 'Preferences/ByHost') stem = stem.replace(BYHOST_UUID, '');

  const id = app.bundleId;
  if (id) {
    if (stem === id) return 'bundle-id';
    if (stem.startsWith(id + '.')) {
      // A longer identifier can belong to a different installed application,
      // the way a preview build extends the identifier of the release.
      const claimed = others.ids.some((other) => stem === other || stem.startsWith(other + '.'));
      return claimed ? null : 'related';
    }
  }
  if (NAME_FOLDERS.includes(folder) && app.names.includes(entry) && !others.names.has(entry)) {
    return 'name';
  }
  return null;
}

// Allocated rather than logical size, since the plan states what removal frees.
function sizeOf(full) {
  try {
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) return directorySize(full, { allocated: true }).bytes;
    return stat.blocks * 512;
  } catch {
    return 0;
  }
}

// Pure apart from reading the folders, so a test can point it at a scratch
// library. Another installed application's identifiers and names are passed in
// so nothing they own is claimed for the one being removed.
function findLeftovers(app, installed, library = LIBRARY) {
  const rest = installed.filter((other) => other.path !== app.path);
  const others = {
    ids: rest
      .map((other) => other.bundleId)
      .filter((other) => other && other !== app.bundleId && other.startsWith(app.bundleId + '.')),
    names: new Set(rest.flatMap((other) => other.names)),
  };

  const found = [];
  for (const folder of ID_FOLDERS) {
    const dir = path.join(library, folder);
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const basis = classify(entry, folder, app, others);
      if (!basis) continue;
      const full = path.join(dir, entry);
      found.push({ path: full, basis, bytes: sizeOf(full) });
    }
  }
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

module.exports = { listApps, findLeftovers, readInfo, runningExecutables, sizeOf, LIBRARY, SELF_ID };
