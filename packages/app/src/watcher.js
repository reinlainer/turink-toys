'use strict';

const fs = require('fs');
const path = require('path');
const core = require('@turink/core');

const { dirs } = core.paths;

// Runs started outside this process leave their events in the journal. Tailing
// the directory is how the window shows work an agent or a quick action is
// doing, without either side needing to know the other exists.

// Records carry their origin only on run.start, so filtering by source alone
// lets the later events of a local run through. The caller supplies the set of
// run identifiers this process started instead.
function watchRuns(onUpdate, isLocal = () => false) {
  fs.mkdirSync(dirs.runs, { recursive: true });
  const offsets = new Map();

  const readNew = (runId) => {
    const file = path.join(dirs.runs, `${runId}.ndjson`);
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      return;
    }
    const seen = offsets.get(runId) || 0;
    if (content.length <= seen) return;

    const fresh = content
      .slice(seen)
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null; // A line still being written is picked up next time.
        }
      })
      .filter(Boolean);

    offsets.set(runId, content.length);
    if (isLocal(runId)) return; // Already delivered to the window directly.
    for (const record of fresh) onUpdate(record);
  };

  // Existing files are marked as read so opening the app does not replay
  // everything that ever ran.
  for (const name of fs.readdirSync(dirs.runs)) {
    if (!name.endsWith('.ndjson')) continue;
    const runId = name.replace(/\.ndjson$/, '');
    try {
      offsets.set(runId, fs.statSync(path.join(dirs.runs, name)).size);
    } catch {
      // A file removed during startup needs no entry.
    }
  }

  const watch = fs.watch(dirs.runs, (eventType, filename) => {
    if (!filename || !filename.endsWith('.ndjson')) return;
    readNew(filename.replace(/\.ndjson$/, ''));
  });

  return () => watch.close();
}

module.exports = { watchRuns };
