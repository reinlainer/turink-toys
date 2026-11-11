'use strict';

const path = require('path');

// Where the native helpers listed in helpers.json are built, and where the
// core finds each one.
//
// The helpers are background applications nobody opens by hand. Spotlight
// lists every application bundle it indexes, so a helper left in an indexed
// folder shows up beside Turink Toys in Spotlight and the app list. A folder
// whose name ends in .noindex is skipped by Spotlight, which keeps them out.

const BUILD = path.join(__dirname, 'build.noindex');
const HELPERS = require('./helpers.json');

function helper(executable) {
  const found = HELPERS.find((h) => h.executable === executable);
  if (!found) throw new Error(`No native helper named ${executable}`);
  const app = path.join(BUILD, `${found.name}.app`);
  return { ...found, app, binary: path.join(app, 'Contents', 'MacOS', found.executable) };
}

module.exports = { BUILD, HELPERS, helper };
