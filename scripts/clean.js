#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Removes local build output and, on macOS, withdraws the development bundle
// from Launch Services.
//
// Deleting the directory alone is not enough: macOS remembers a bundle it has
// seen, so a stale entry keeps appearing in Launchpad and Spotlight until it is
// unregistered. That is what made a development build look like a second copy
// of the installed application.

const ROOT = path.resolve(__dirname, '..');
const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework' +
  '/Support/lsregister';

function unregister(bundle) {
  if (process.platform !== 'darwin' || !fs.existsSync(LSREGISTER)) return;
  try {
    execFileSync(LSREGISTER, ['-u', bundle], { stdio: 'ignore' });
  } catch {
    // Nothing to withdraw is the normal case and not a failure.
  }
}

function main() {
  const build = path.join(ROOT, 'build');

  if (fs.existsSync(build)) {
    for (const entry of fs.readdirSync(build)) {
      if (entry.endsWith('.app')) unregister(path.join(build, entry));
    }
  }

  let removed = 0;
  for (const name of ['build', 'dist']) {
    const target = path.join(ROOT, name);
    if (!fs.existsSync(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    process.stdout.write(`Removed ${name}/\n`);
    removed += 1;
  }

  if (removed === 0) process.stdout.write('Nothing to remove.\n');
}

main();
