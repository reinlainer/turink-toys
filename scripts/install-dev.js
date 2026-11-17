#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Builds the development bundle and puts it in /Applications in place of the
// previous one, leaving exactly one copy on the machine.
//
// Every copy of a bundle macOS has seen is offered in Spotlight, Launchpad and
// Open With, including one sitting in the build folder or in the Trash. So the
// old copy is deleted rather than trashed, the built one is removed once it has
// been copied, and Launch Services is told about each change instead of being
// left to find stale entries. Electron's own app in node_modules is withdrawn
// from Launch Services for the same reason.

const ROOT = path.resolve(__dirname, '..');
const NAME = 'Turink Toys-dev';
const BUNDLE_ID = 'toys.turink.app.dev';
const BUILT = path.join(ROOT, 'build.noindex', `${NAME}.app`);
const INSTALLED = path.join('/Applications', `${NAME}.app`);
const ELECTRON = path.join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app');
const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework' +
  '/Support/lsregister';

const say = (line) => process.stdout.write(`${line}\n`);

function lsregister(args) {
  try {
    execFileSync(LSREGISTER, args, { stdio: 'ignore' });
  } catch {
    // An entry that is already gone is the normal case.
  }
}

function running() {
  try {
    execFileSync('/usr/bin/pgrep', ['-f', `${INSTALLED}/Contents/MacOS/`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Asked to quit first so it can stop its helpers; forced only if it will not.
function quit() {
  if (!running()) return;
  try {
    execFileSync('/usr/bin/osascript', ['-e', `tell application id "${BUNDLE_ID}" to quit`], { stdio: 'ignore' });
  } catch {
    // Not answering Apple Events; handled below.
  }
  for (let i = 0; i < 20 && running(); i += 1) sleep(500);
  if (running()) {
    execFileSync('/usr/bin/pkill', ['-f', `${INSTALLED}/Contents/MacOS/`], { stdio: 'ignore' });
    sleep(1000);
  }
  say(`Quit ${NAME}`);
}

function main() {
  if (process.platform !== 'darwin') {
    say('The development app is installed on macOS only.');
    return;
  }

  execFileSync(process.execPath, [path.join(__dirname, 'clean.js')], { stdio: 'inherit' });
  execFileSync(process.execPath, [path.join(__dirname, 'bundle-app.js')], { stdio: 'inherit' });

  quit();
  fs.rmSync(INSTALLED, { recursive: true, force: true });
  execFileSync('/usr/bin/ditto', [BUILT, INSTALLED]);
  say(`Installed ${INSTALLED}`);

  lsregister(['-u', BUILT]);
  fs.rmSync(path.dirname(BUILT), { recursive: true, force: true });
  lsregister(['-u', ELECTRON]);
  lsregister(['-f', INSTALLED]);

  execFileSync('/usr/bin/open', [INSTALLED]);
  say(`Opened ${NAME}`);
}

main();
