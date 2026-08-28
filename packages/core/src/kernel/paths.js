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

module.exports = { dirs, HOME, assertUnderHome };
