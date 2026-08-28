'use strict';

const fs = require('fs');
const path = require('path');
const { HOME, dirs } = require('../../kernel/paths');

// Targets are addressed by slug rather than by display name or list position.
// A slug survives translation and reordering, so an agent can name a target in
// one call and act on it in the next without parsing any output.
//
// "kind" describes what a location holds, not whether the user is allowed to
// delete it. A cache is rebuilt automatically by the tool that owns it, while
// a toolchain has to be downloaded and installed again. Both can be removed.
// The distinction drives how loudly the consequence is stated and whether an
// extra opt-in is required, because how much a directory is worth depends on
// how often its owner is used, which only the user knows.

const CACHE = 'cache';
const TOOLCHAIN = 'toolchain';

function home(relative) {
  return path.join(HOME, relative);
}

const BUILT_IN = [
  {
    slug: 'npm.cache',
    name: 'npm cache',
    group: 'Node.js',
    path: home('.npm'),
    kind: CACHE,
    consequence: 'npm downloads packages again on the next install.',
  },
  {
    slug: 'npm.library-cache',
    name: 'npm cache (Library)',
    group: 'Node.js',
    path: home('Library/Caches/npm'),
    kind: CACHE,
    consequence: 'npm downloads packages again on the next install.',
  },
  {
    slug: 'yarn.cache',
    name: 'Yarn cache',
    group: 'Node.js',
    path: home('Library/Caches/Yarn'),
    kind: CACHE,
    consequence: 'Yarn downloads packages again on the next install.',
  },
  {
    slug: 'yarn.global',
    name: 'Yarn global directory',
    group: 'Node.js',
    path: home('.yarn'),
    kind: TOOLCHAIN,
    consequence: 'Globally installed packages and Yarn releases have to be installed again.',
  },
  {
    slug: 'pnpm.store',
    name: 'pnpm store',
    group: 'Node.js',
    path: home('Library/pnpm'),
    kind: TOOLCHAIN,
    consequence:
      'Existing node_modules link into this store and break. Prefer "pnpm store prune".',
  },
  {
    slug: 'xcode.deriveddata',
    name: 'Xcode DerivedData',
    group: 'Xcode',
    path: home('Library/Developer/Xcode/DerivedData'),
    kind: CACHE,
    consequence: 'The next build takes longer while Xcode rebuilds it.',
  },
  {
    slug: 'xcode.archives',
    name: 'Xcode archives',
    group: 'Xcode',
    path: home('Library/Developer/Xcode/Archives'),
    kind: TOOLCHAIN,
    consequence:
      'Submitted build archives and the dSYM files needed to symbolicate their crash reports are lost permanently.',
  },
  {
    slug: 'xcode.simulators',
    name: 'iOS simulator devices',
    group: 'Xcode',
    path: home('Library/Developer/CoreSimulator/Devices'),
    kind: TOOLCHAIN,
    consequence:
      'Simulator devices and their installed apps are lost. Xcode recreates devices, and runtimes download again on demand.',
  },
  {
    slug: 'developer.all',
    name: 'Developer directory (everything above)',
    group: 'Xcode',
    path: home('Library/Developer'),
    kind: TOOLCHAIN,
    contains: ['xcode.deriveddata', 'xcode.archives', 'xcode.simulators'],
    consequence:
      'Removes DerivedData, archives, simulators and downloaded runtimes together. Suited to someone who builds for Apple platforms only occasionally.',
  },
  {
    slug: 'gradle.cache',
    name: 'Gradle cache',
    group: 'Android',
    path: home('.gradle/caches'),
    kind: CACHE,
    consequence: 'Gradle downloads dependencies again on the next build.',
  },
  {
    slug: 'android.studio-cache',
    name: 'Android Studio cache',
    group: 'Android',
    path: home('Library/Caches/Google'),
    glob: 'AndroidStudio*',
    kind: CACHE,
    consequence: 'Android Studio rebuilds its indexes on the next launch.',
  },
  {
    slug: 'android.sdk',
    name: 'Android SDK',
    group: 'Android',
    path: home('Library/Android/sdk'),
    kind: TOOLCHAIN,
    consequence:
      'The SDK, NDK and emulator images have to be downloaded again through Android Studio.',
  },
];

// The built-in list cannot suit every machine, so a user can add locations of
// their own and reclassify a built-in one. Nothing here bypasses the safety
// checks: a custom entry still has to sit under the home directory and still
// passes through the same plan and confirmation.
const USER_FILE = path.join(dirs.support, 'targets.json');

function loadUserTargets() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
  } catch {
    return { added: [], overrides: {} };
  }
  const added = (raw.targets || [])
    .filter((t) => t.slug && t.path)
    .map((t) => ({
      slug: t.slug,
      name: t.name || t.slug,
      group: t.group || 'Custom',
      path: t.path.startsWith('~') ? path.join(HOME, t.path.slice(1)) : t.path,
      kind: t.kind === CACHE ? CACHE : TOOLCHAIN,
      glob: t.glob || undefined,
      consequence: t.consequence || 'Added by the user; the effect of removing it is not recorded.',
      custom: true,
    }));
  return { added, overrides: raw.overrides || {} };
}

function all() {
  const { added, overrides } = loadUserTargets();
  const merged = [...BUILT_IN, ...added].map((target) => {
    const override = overrides[target.slug];
    if (!override) return target;
    return {
      ...target,
      kind: override.kind === CACHE ? CACHE : override.kind === TOOLCHAIN ? TOOLCHAIN : target.kind,
      reclassified: Boolean(override.kind) && override.kind !== target.kind,
    };
  });
  return merged;
}

function get(slug) {
  return all().find((t) => t.slug === slug) || null;
}

function caches() {
  return all().filter((t) => t.kind === CACHE);
}

function toolchains() {
  return all().filter((t) => t.kind === TOOLCHAIN);
}

module.exports = { all, get, caches, toolchains, CACHE, TOOLCHAIN, USER_FILE, BUILT_IN };
