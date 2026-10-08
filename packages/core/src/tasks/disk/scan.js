'use strict';

const fs = require('fs');
const path = require('path');
const { dirs } = require('../../kernel/paths');
const { formatBytes } = require('../../kernel/format');

// Scanning walks large directory trees, so the result is cached. disk.report and
// disk.clean both read the cache, which keeps a report followed by a cleanup
// from paying the walk cost twice. The scan time travels with the result so a
// caller can judge how stale the numbers are.

const CACHE_FILE = path.join(dirs.state, 'scan.json');
const CACHE_TTL_MS = 10 * 60 * 1000;

function resolveGlob(target) {
  if (!target.glob) return fs.existsSync(target.path) ? [target.path] : [];
  if (!fs.existsSync(target.path)) return [];
  const prefix = target.glob.replace(/\*$/, '');
  return fs
    .readdirSync(target.path)
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(target.path, name));
}

// Logical size is what disk.report has always shown. Allocated size counts the
// blocks a file actually occupies, which is what removing it frees; the two
// differ for sparse files such as a virtual machine disk.
function directorySize(root, { allocated = false } = {}) {
  let total = 0;
  let files = 0;
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue; // A directory the user cannot read contributes nothing.
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue; // Following links would double-count.
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(full);
          total += allocated ? stat.blocks * 512 : stat.size;
          files += 1;
        } catch {
          // A file removed mid-scan needs no handling.
        }
      }
    }
  }
  return { bytes: total, files };
}

function scanTarget(target) {
  const paths = resolveGlob(target);
  let bytes = 0;
  let files = 0;
  for (const p of paths) {
    const measured = directorySize(p);
    bytes += measured.bytes;
    files += measured.files;
  }
  return {
    slug: target.slug,
    name: target.name,
    group: target.group,
    kind: target.kind,
    consequence: target.consequence,
    paths,
    exists: paths.length > 0,
    bytes,
    files,
  };
}

function readCache() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - new Date(cached.scannedAt).getTime() > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  fs.mkdirSync(dirs.state, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload));
}

function scan(targets, run, { useCache = true } = {}) {
  if (useCache) {
    const cached = readCache();
    if (cached) {
      const wanted = new Set(targets.map((t) => t.slug));
      const subset = cached.results.filter((r) => wanted.has(r.slug));
      if (subset.length === targets.length) {
        return { results: subset, scannedAt: cached.scannedAt, fromCache: true };
      }
    }
  }

  const results = [];
  targets.forEach((target, index) => {
    if (run) run.progress(index + 1, targets.length, target.name, 'target');
    results.push(scanTarget(target));
  });

  const payload = { scannedAt: new Date().toISOString(), results };
  writeCache(payload);
  return { ...payload, fromCache: false };
}

module.exports = { scan, scanTarget, directorySize, resolveGlob, formatBytes, CACHE_TTL_MS };
