'use strict';

const fs = require('fs');
const path = require('path');
const { dirs } = require('./paths');

const RETENTION_DAYS = 30;

// Every run writes one NDJSON file. The GUI watches this directory to render
// runs it did not start, and "turink-toys runs" reads the same files, so the two
// front ends observe identical history.

function runFile(runId) {
  return path.join(dirs.runs, `${runId}.ndjson`);
}

function open(runId) {
  fs.mkdirSync(dirs.runs, { recursive: true });
  const stream = fs.createWriteStream(runFile(runId), { flags: 'a' });
  return {
    write(event) {
      stream.write(JSON.stringify(event) + '\n');
    },
    close() {
      return new Promise((resolve) => stream.end(resolve));
    },
  };
}

function read(runId) {
  const file = runFile(runId);
  if (!fs.existsSync(file)) return null;
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function list({ limit = 20, activeOnly = false } = {}) {
  if (!fs.existsSync(dirs.runs)) return [];
  const entries = fs
    .readdirSync(dirs.runs)
    .filter((name) => name.endsWith('.ndjson'))
    .map((name) => name.replace(/\.ndjson$/, ''))
    .sort()
    .reverse();

  const out = [];
  for (const runId of entries) {
    const events = read(runId);
    if (!events || events.length === 0) continue;
    const start = events.find((e) => e.event === 'run.start');
    const end = events.find((e) => e.event === 'run.end');
    if (activeOnly && end) continue;
    out.push({
      run: runId,
      task: start ? start.task : null,
      source: start ? start.source : null,
      startedAt: start ? start.ts : null,
      status: end ? end.status : 'running',
    });
    if (out.length >= limit) break;
  }
  return out;
}

// Pruning runs at most once a day rather than on every invocation, so a
// command that finishes in milliseconds does not also scan the whole
// directory. The stamp file is what makes that cheap to decide.
const PRUNE_STAMP = path.join(dirs.state, 'pruned');
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function pruneIfDue(days = RETENTION_DAYS) {
  try {
    const last = fs.statSync(PRUNE_STAMP).mtimeMs;
    if (Date.now() - last < PRUNE_INTERVAL_MS) return 0;
  } catch {
    // No stamp yet, so this is the first run and pruning proceeds.
  }
  try {
    fs.mkdirSync(dirs.state, { recursive: true });
    fs.writeFileSync(PRUNE_STAMP, new Date().toISOString());
    return prune(days);
  } catch {
    return 0; // Housekeeping must never fail the run that triggered it.
  }
}

function prune(days = RETENTION_DAYS) {
  if (!fs.existsSync(dirs.runs)) return 0;
  const cutoff = Date.now() - days * 86400000;
  let removed = 0;
  for (const name of fs.readdirSync(dirs.runs)) {
    const file = path.join(dirs.runs, name);
    try {
      if (fs.statSync(file).mtimeMs < cutoff) {
        fs.unlinkSync(file);
        removed += 1;
      }
    } catch {
      // A file that vanished between listing and stat needs no handling.
    }
  }
  return removed;
}

module.exports = { open, read, list, prune, pruneIfDue, runFile, RETENTION_DAYS };
