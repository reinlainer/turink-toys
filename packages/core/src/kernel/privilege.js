'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const { fail } = require('./errors');

const run = promisify(execFile);

// Raising privilege is confined to the power domain and to this module. Any
// other caller reaching here is a defect, so the guard throws rather than
// prompting.
const ALLOWED_DOMAINS = new Set(['power']);

function assertAllowed(domain) {
  if (!ALLOWED_DOMAINS.has(domain)) {
    throw new Error(`domain "${domain}" may not raise privilege`);
  }
}

function isRoot() {
  return typeof process.getuid === 'function' && process.getuid() === 0;
}

// An agent runs without a terminal that can host an authentication dialog, so
// it is told what to do instead of being left with an opaque failure.
function requireRoot(domain, action) {
  assertAllowed(domain);
  if (isRoot()) return;
  fail('NEEDS_PRIVILEGE', `${action} requires administrator rights.`, {
    hint: 'Run this from the Turink Toys app, or prefix the command with "sudo" in a terminal.',
    retryable: false,
  });
}

async function sudoExec(domain, file, args) {
  assertAllowed(domain);
  return run(file, args);
}

module.exports = { requireRoot, sudoExec, isRoot, ALLOWED_DOMAINS };
