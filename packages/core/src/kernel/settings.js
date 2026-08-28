'use strict';

const fs = require('fs');
const path = require('path');
const { dirs } = require('./paths');

// Small persistent preferences shared by every front end. A choice a person
// makes in the window has to survive a restart, otherwise it reads as a bug
// rather than a setting.

const FILE = path.join(dirs.support, 'settings.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function get(key, fallback = null) {
  const value = read()[key];
  return value === undefined ? fallback : value;
}

function set(key, value) {
  const current = read();
  current[key] = value;
  fs.mkdirSync(dirs.support, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(current, null, 2));
  return value;
}

module.exports = { get, set, read, FILE };
