'use strict';

const { after } = require('node:test');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Temporary folders for tests, removed when the test file finishes so runs do
// not pile them up in the system's temporary folder. Requiring this from the
// top of a test file registers the cleanup for that file.

const made = [];

after(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

// The real path is returned because macOS reaches the temporary folder
// through a link, and paths the code under test reports are resolved.
function tempDir(prefix) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  made.push(dir);
  return dir;
}

module.exports = { tempDir };
