'use strict';

const fs = require('fs');
const path = require('path');
const { dirs } = require('./paths');
const { fail } = require('./errors');

// The CLI and the GUI are separate processes that cannot see each other. A
// domain lock keeps one from deleting what the other is deleting. Read tasks
// never take a lock, so reporting stays available while a cleanup runs.

function lockFile(domain) {
  return path.join(dirs.locks, `${domain}.lock`);
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function readLock(domain) {
  const file = lockFile(domain);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function acquire(domain, runId) {
  fs.mkdirSync(dirs.locks, { recursive: true });
  const file = lockFile(domain);

  const held = readLock(domain);
  if (held && alive(held.pid)) {
    fail('LOCKED', `Another run is working on "${domain}" (run ${held.run}).`, {
      hint: `Watch it with "turink-toys runs tail ${held.run}", then retry.`,
      retryable: true,
      details: { holder: held.run, pid: held.pid, since: held.since },
    });
  }
  // A lock left behind by a crashed process is reclaimed rather than honoured.
  if (held) fs.rmSync(file, { force: true });

  fs.writeFileSync(
    file,
    JSON.stringify({ run: runId, pid: process.pid, since: new Date().toISOString() })
  );

  return function release() {
    const current = readLock(domain);
    if (current && current.run === runId) fs.rmSync(file, { force: true });
  };
}

module.exports = { acquire, readLock, lockFile };
