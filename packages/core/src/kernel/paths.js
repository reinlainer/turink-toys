'use strict';

const os = require('os');
const path = require('path');

const HOME = path.resolve(os.homedir());
const SUPPORT = path.join(HOME, 'Library', 'Application Support', 'turink-toys');

const dirs = {
  home: HOME,
  support: SUPPORT,
  runs: path.join(SUPPORT, 'runs'),
  locks: path.join(SUPPORT, 'locks'),
  state: path.join(SUPPORT, 'state'),
};

// Deleting outside the home directory is never part of this tool's job. The
// check lives here alone so no front end can reach a task without passing it.
function assertUnderHome(target) {
  const resolved = path.resolve(target);
  if (resolved !== HOME && !resolved.startsWith(HOME + path.sep)) {
    const { fail } = require('./errors');
    fail('OUTSIDE_HOME', `Refusing to touch a path outside the home directory: ${resolved}`, {
      hint: 'Only paths under the home directory are eligible.',
    });
  }
  return resolved;
}

// Applications are the one thing this tool removes from outside the home
// directory. The exception is kept to an application bundle sitting in an
// applications folder, or one folder down where vendors group their suites, so
// a wrong path can never widen it to the folder itself or to anything else.
const APP_ROOTS = ['/Applications', path.join(HOME, 'Applications')];

function assertAppBundle(target) {
  const fs = require('fs');
  const { fail } = require('./errors');
  const resolved = path.resolve(target);

  const root = APP_ROOTS.find((r) => resolved.startsWith(r + path.sep));
  const depth = root ? path.relative(root, resolved).split(path.sep).length : 0;
  let isBundle = false;
  try {
    const stat = fs.lstatSync(resolved);
    isBundle = stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    // A path that does not exist is refused below like any other.
  }

  if (!root || depth > 2 || !resolved.endsWith('.app') || !isBundle) {
    fail('OUTSIDE_HOME', `Refusing to touch a path that is not an installed application: ${resolved}`, {
      hint: 'Only application bundles inside /Applications or ~/Applications are eligible.',
    });
  }
  return resolved;
}

module.exports = { dirs, HOME, APP_ROOTS, assertUnderHome, assertAppBundle };
