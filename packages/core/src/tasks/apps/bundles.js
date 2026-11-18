'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { HOME, APP_ROOTS } = require('../../kernel/paths');
const { directorySize } = require('../disk/scan');

const exec = promisify(execFile);

const LIBRARY = path.join(HOME, 'Library');
const CLOUD_STORAGE = path.join(LIBRARY, 'CloudStorage');

// Release and development builds of this tool both start with this identifier.
const SELF_ID = 'toys.turink.app';

// ---------------------------------------------------------------------------
// Discovery

function xmlText(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

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
  return xmlText(match[1]) || null;
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

// ---------------------------------------------------------------------------
// Cloud storage

// macOS gives every file provider account a folder under CloudStorage and
// marks it with the provider extension's identifier. An extension's identifier
// always extends that of the app containing it, which ties a folder to an app
// without looking inside any bundle.
const DOMAIN_ATTRIBUTE = 'com.apple.file-provider-domain-id';

async function cloudDomains(root = CLOUD_STORAGE) {
  let names;
  try {
    names = fs.readdirSync(root);
  } catch {
    return [];
  }
  const folders = names
    .filter((name) => !name.startsWith('.'))
    .map((name) => path.join(root, name))
    .filter(isRealDirectory);
  const read = await Promise.all(
    folders.map(async (folder) => {
      try {
        const { stdout } = await exec('/usr/bin/xattr', ['-p', DOMAIN_ATTRIBUTE, folder]);
        const provider = stdout.trim().split('/')[0];
        return provider ? { path: folder, provider } : null;
      } catch {
        return null; // A plain folder left behind after an account was disconnected.
      }
    })
  );
  return read.filter(Boolean);
}

// Each folder goes to the installed app with the longest identifier the
// provider extends, so a preview build that extends the release's identifier
// is not mistaken for the release.
function cloudOwners(domains, apps) {
  const owned = new Map();
  for (const domain of domains) {
    let owner = null;
    for (const app of apps) {
      const id = app.bundleId;
      if (!id || !(domain.provider === id || domain.provider.startsWith(id + '.'))) continue;
      if (!owner || id.length > owner.bundleId.length) owner = app;
    }
    if (!owner) continue;
    if (!owned.has(owner.path)) owned.set(owner.path, []);
    owned.get(owner.path).push(domain.path);
  }
  return owned;
}

async function listApps() {
  const paths = bundlePaths();
  const [infos, running, flags, domains] = await Promise.all([
    Promise.all(paths.map(readInfo)),
    runningExecutables(),
    fileFlags(paths),
    cloudDomains(),
  ]);

  const apps = paths.map((appPath, index) => {
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
      cloudStorage: [],
    };
  });
  const owned = cloudOwners(domains, apps);
  for (const app of apps) app.cloudStorage = owned.get(app.path) || [];
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Components, signatures and vendors

// codesign prints the signature's facts on stderr and, asked for them, the
// entitlements as XML on stdout, so one call gives both. An unsigned bundle
// has neither.
async function signing(bundlePath) {
  try {
    const { stdout, stderr } = await exec(
      '/usr/bin/codesign',
      ['-dv', '--entitlements', '-', '--xml', bundlePath],
      { maxBuffer: 8 * 1024 * 1024 }
    );
    const team = (stderr.match(/^TeamIdentifier=(.+)$/m) || [])[1];
    return { team: team && team.trim() !== 'not set' ? team.trim() : null, groups: appGroups(stdout) };
  } catch {
    return { team: null, groups: [] };
  }
}

// The data groups an app shares with others of its vendor. Each names a folder
// under Group Containers and Application Scripts, so a value that could step
// out of those folders is ignored.
function appGroups(xml) {
  const block = String(xml).match(
    /<key>com\.apple\.security\.application-groups<\/key>\s*<array>([\s\S]*?)<\/array>/
  );
  if (!block) return [];
  return unique(
    [...block[1].matchAll(/<string>([^<]*)<\/string>/g)]
      .map((match) => xmlText(match[1]))
      .filter((name) => name && name !== '.' && name !== '..' && !name.includes('/'))
  );
}

// The reverse-domain part of an identifier that names its vendor:
// com.microsoft.OneDrive gives com.microsoft, and imagetasks.Pixea gives
// imagetasks. Apple's namespace gives nothing, because the system's own
// components share it and none of them sit in an applications folder where
// the checks below could see that they also use a folder.
function isAppleId(bundleId) {
  return Boolean(bundleId) && bundleId.startsWith('com.apple.');
}

function vendorOf(bundleId) {
  if (!bundleId || isAppleId(bundleId)) return null;
  const parts = bundleId.split('.');
  if (parts.length < 2) return null;
  return parts.slice(0, Math.min(2, parts.length - 1)).join('.');
}

const COMPONENT_SUFFIXES = ['.app', '.appex', '.xpc', '.systemextension'];
const COMPONENT_DEPTH = 7;

// Helpers, extensions and services shipped inside a bundle, wherever the
// vendor put them: Contents/Library/LoginItems, PlugIns, XPCServices, inside a
// framework. Links are not followed, so a framework's Versions/Current is not
// walked twice.
function componentPaths(appPath) {
  const found = [];
  const stack = [[path.join(appPath, 'Contents'), 0]];
  while (stack.length > 0) {
    const [dir, depth] = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (COMPONENT_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) found.push(full);
      if (depth + 1 < COMPONENT_DEPTH) stack.push([full, depth + 1]);
    }
  }
  return found;
}

// Bounded concurrency for the many short codesign and plutil calls.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// A component's data sits under its own identifier, which need not extend the
// app's: OneDrive's login helper is com.microsoft.OneDriveLauncher. Only
// components named under one of the given vendors are kept. A framework the
// app bundles, such as an updater, carries its own vendor's identifiers, and
// folders under those serve every app that ships the same framework.
async function bundleComponents(appPath, vendors) {
  const wanted = vendors.filter(Boolean);
  if (wanted.length === 0) return [];
  const paths = componentPaths(appPath);
  const infos = await mapLimit(paths, 8, readInfo);
  const found = [];
  for (const [index, info] of infos.entries()) {
    const id = info.bundleId;
    if (!id || !wanted.includes(vendorOf(id))) continue;
    if (!found.some((component) => component.bundleId === id)) found.push({ path: paths[index], bundleId: id });
  }
  return found;
}

// What a removal plan needs beyond the Library folders: the app's components,
// the data groups it and they declare, and the other installed apps from the
// same vendor (same signing team or same identifier vendor) with the
// components and groups they declare, since those may share what the app
// uses. Reading signatures costs a few hundredths of a second per bundle, so
// it happens only when a removal is planned.
//
// An app in Apple's namespace gets neither components nor groups: the system's
// own components share both and none of them can be checked for use.
async function removalFacts(app, installed) {
  if (isAppleId(app.bundleId)) return { components: [], groups: [], siblings: [] };
  const vendor = vendorOf(app.bundleId);
  const signatures = await mapLimit(installed, 8, (other) => signing(other.path));
  const own = signatures[installed.findIndex((other) => other.path === app.path)] || { team: null, groups: [] };

  const components = vendor ? await bundleComponents(app.path, [vendor]) : [];
  const componentGroups = await mapLimit(components, 8, (component) => signing(component.path));
  const groups = unique([...own.groups, ...componentGroups.flatMap((signature) => signature.groups)]);

  const siblings = [];
  for (const [index, other] of installed.entries()) {
    if (other.path === app.path) continue;
    const sameTeam = own.team && signatures[index].team === own.team;
    const sameVendor = vendor && vendorOf(other.bundleId) === vendor;
    if (!sameTeam && !sameVendor) continue;
    const theirs = await bundleComponents(other.path, unique([vendor, vendorOf(other.bundleId)]));
    const theirGroups = await mapLimit(theirs, 8, (component) => signing(component.path));
    siblings.push({
      name: other.name,
      bundleId: other.bundleId,
      components: theirs.map((component) => component.bundleId),
      groups: unique([...signatures[index].groups, ...theirGroups.flatMap((signature) => signature.groups)]),
    });
  }

  return {
    components: components.map((component) => component.bundleId).filter((id) => id !== app.bundleId),
    groups,
    siblings,
  };
}

// ---------------------------------------------------------------------------
// Leftovers

// Where applications keep per-user data, each named after a bundle identifier:
// the app's own or one of its components'.
const ID_FOLDERS = [
  'Application Scripts',
  'Application Support',
  'Application Support/FileProvider',
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

// Folders named after a data group the app declares in its signature rather
// than after an identifier. Group names are never guessed from the app's name.
const GROUP_FOLDERS = ['Group Containers', 'Application Scripts'];

// Folders where cross-platform applications use their name instead of an
// identifier. Matching by name is less certain, so only these are searched
// that way and the plan says so.
const NAME_FOLDERS = ['Application Support', 'Caches', 'Logs'];

const SUFFIXES = ['.plist', '.savedState', '.binarycookies'];
const BYHOST_UUID = /\.[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

function stemOf(entry, folder) {
  let stem = entry;
  for (const suffix of SUFFIXES) {
    if (stem.endsWith(suffix)) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }
  if (folder === 'Preferences/ByHost') stem = stem.replace(BYHOST_UUID, '');
  return stem;
}

// The basis says how sure the match is. "bundle-id" is the app's identifier
// itself, "related" is something named under it (an installer, a helper),
// "component" is a helper or extension shipped inside the app under its own
// identifier, and "name" is a folder that only shares the application's name.
//
// The most specific identifier the entry carries decides. If another installed
// app owns an identifier at least that specific, or ships the same component,
// the entry is theirs: a preview build extends the release's identifier, and
// Office apps each ship the same error reporter.
function classify(entry, folder, own, claimed, names, otherNames) {
  const stem = stemOf(entry, folder);
  let best = null;
  for (const candidate of own) {
    if (stem !== candidate.id && !stem.startsWith(candidate.id + '.')) continue;
    if (!best || candidate.id.length > best.id.length) best = candidate;
  }
  if (best) {
    const taken = claimed.some(
      (other) => (stem === other || stem.startsWith(other + '.')) && !best.id.startsWith(other + '.')
    );
    if (taken) return null;
    if (!best.main) return 'component';
    return stem === best.id ? 'bundle-id' : 'related';
  }
  if (NAME_FOLDERS.includes(folder) && names.includes(entry) && !otherNames.has(entry)) return 'name';
  return null;
}

// Allocated rather than logical size, since the plan states what removal frees.
// `complete` is false when part of it could not be read, as with another
// app's data that macOS protects.
function sizeOf(full) {
  try {
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      const measured = directorySize(full, { allocated: true });
      return { bytes: measured.bytes, complete: measured.complete };
    }
    return { bytes: stat.blocks * 512, complete: true };
  } catch (err) {
    return { bytes: 0, complete: err.code === 'ENOENT' };
  }
}

function measured(full) {
  const size = sizeOf(full);
  return size.complete ? { bytes: size.bytes } : { bytes: size.bytes, sizeUnknown: true };
}

// Pure apart from reading the folders, so a test can point it at a scratch
// library. `facts` is what removalFacts found; without it only the app's own
// identifier and names are searched.
//
// Returns the items to remove and, separately, the group folders left in place
// because another installed app declares the same group.
function findLeftovers(app, installed, library = LIBRARY, facts = {}) {
  const components = facts.components || [];
  const groups = facts.groups || [];
  const siblings = facts.siblings || [];

  const rest = installed.filter((other) => other.path !== app.path);
  const own = [
    ...(app.bundleId ? [{ id: app.bundleId, main: true }] : []),
    ...components.filter((id) => id !== app.bundleId).map((id) => ({ id, main: false })),
  ];
  const claimed = unique([
    ...rest.map((other) => other.bundleId),
    ...siblings.flatMap((sibling) => sibling.components || []),
  ]);
  const otherNames = new Set(rest.flatMap((other) => other.names || []));

  const items = [];
  const kept = [];
  const seen = new Set();
  const add = (list, entry) => {
    if (seen.has(entry.path)) return;
    seen.add(entry.path);
    list.push(entry);
  };

  for (const folder of ID_FOLDERS) {
    const dir = path.join(library, folder);
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const basis = classify(entry, folder, own, claimed, app.names || [], otherNames);
      if (!basis) continue;
      const full = path.join(dir, entry);
      add(items, { path: full, basis, ...measured(full) });
    }
  }

  for (const group of groups) {
    const users = siblings.filter((sibling) => (sibling.groups || []).includes(group)).map((sibling) => sibling.name);
    for (const folder of GROUP_FOLDERS) {
      const full = path.join(library, folder, group);
      if (!fs.existsSync(full)) continue;
      if (users.length > 0) add(kept, { path: full, reason: 'shared', sharedWith: users });
      else add(items, { path: full, basis: 'group', ...measured(full) });
    }
  }

  const byPath = (a, b) => a.path.localeCompare(b.path);
  return { items: items.sort(byPath), kept: kept.sort(byPath) };
}

module.exports = {
  listApps,
  findLeftovers,
  removalFacts,
  cloudDomains,
  cloudOwners,
  appGroups,
  vendorOf,
  readInfo,
  runningExecutables,
  sizeOf,
  LIBRARY,
  SELF_ID,
};
