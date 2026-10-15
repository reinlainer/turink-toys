'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { fail } = require('./errors');

const exec = promisify(execFile);
const OSASCRIPT = '/usr/bin/osascript';
const TRASH_TOOL = '/usr/bin/trash';
const HOME = path.resolve(os.homedir());
const HOME_TRASH = path.join(HOME, '.Trash');

// Two routes into and out of the Trash, chosen by where an item lives.
//
// Items under the home directory move directly: /usr/bin/trash puts them in
// and reports the name each one ended up with, and a known name can be moved
// back out by its exact path. Finder is not used for them because macOS
// refuses Finder's scripted moves on some of them, such as another app's
// sandbox container under ~/Library/Containers, and only after a fifteen
// second wait.
//
// Applications move through Finder, which raises the administrator prompt
// itself when a bundle belongs to another user, as applications installed from
// a package or the App Store do. Each route falls back to the other when it is
// refused, so an item is only reported as failed when neither could move it.

function underHome(target) {
  return path.resolve(target).startsWith(HOME + path.sep);
}

// The path travels as an argument rather than inside the script text, so a
// name containing quotes cannot change what the script does. Converting it to
// an alias outside the Finder block matters: inside it, Finder resolves the
// coercion and intermittently rejects it.
const DELETE_SCRIPT = [
  'on run argv',
  '  set theFile to (POSIX file (item 1 of argv)) as alias',
  '  tell application "Finder"',
  '    set theItem to delete theFile',
  '    return name of theItem',
  '  end tell',
  'end run',
].join('\n');

// Finder keeps the name an item had in the Trash when moving it out, so an
// item the Trash renamed has to be given its original name back. If that name
// is taken at the destination by then, the rename fails and the item is
// reported rather than left under the wrong name silently.
const RESTORE_SCRIPT = [
  'on run argv',
  '  tell application "Finder"',
  '    set theItem to (first item of the trash whose name is (item 1 of argv))',
  '    set movedItem to move theItem to POSIX file (item 2 of argv)',
  '    if name of movedItem is not (item 3 of argv) then',
  '      try',
  '        set name of movedItem to (item 3 of argv)',
  '      on error',
  '        error "Restored as \\"" & (name of movedItem) & "\\" because \\"" & (item 3 of argv) & "\\" already exists."',
  '      end try',
  '    end if',
  '  end tell',
  'end run',
].join('\n');

function denied(message) {
  return message.includes('-1743') || message.toLowerCase().includes('not authorized');
}

function failNotAuthorized(action) {
  fail('NEEDS_PRIVILEGE', `${action} requires permission to control Finder.`, {
    hint: 'Approve the Finder automation prompt, or enable it under Privacy & Security > Automation.',
    retryable: true,
  });
}

// The Trash renames an item whose name is already taken, and items gathered
// from different folders often share a name. The name each route reports is
// therefore what gets recorded, so a later restore picks the right item.
async function finderDelete(target) {
  try {
    const { stdout } = await exec(OSASCRIPT, ['-e', DELETE_SCRIPT, target]);
    return { ok: true, trashName: stdout.trim() };
  } catch (err) {
    const message = String(err.stderr || err.message);
    if (denied(message)) failNotAuthorized('Moving to the Trash');
    // -128 is the user dismissing the administrator prompt.
    if (message.includes('-128')) return { ok: false, reason: 'Cancelled at the administrator prompt.' };
    return { ok: false, reason: message.trim() };
  }
}

// /usr/bin/trash -v prints 'Moved "<from>" to "<to>"' for each item.
async function directDelete(target) {
  try {
    const { stdout, stderr } = await exec(TRASH_TOOL, ['-v', target]);
    const moved = `${stdout}\n${stderr}`.match(/Moved ".*" to "(.*)"\s*$/m);
    if (moved) return { ok: true, trashName: path.basename(moved[1]) };
    // Moved but unreported: the original name is the best record available,
    // and trying Finder now would only fail on an item no longer there.
    if (!fs.existsSync(target)) return { ok: true, trashName: path.basename(target) };
    return { ok: false, reason: 'trash reported nothing and the item is still in place.' };
  } catch (err) {
    return { ok: false, reason: String(err.stderr || err.message).trim() };
  }
}

async function moveToTrash(target) {
  const [first, second] = underHome(target) ? [directDelete, finderDelete] : [finderDelete, directDelete];
  const outcome = await first(target);
  if (outcome.ok || !fs.existsSync(target)) return outcome;
  const retry = await second(target);
  return retry.ok ? retry : { ok: false, reason: `${outcome.reason} / ${retry.reason}` };
}

async function finderRestore(trashName, destination) {
  const destinationDir = path.dirname(destination);
  const originalName = path.basename(destination);
  try {
    await exec(OSASCRIPT, ['-e', RESTORE_SCRIPT, trashName, destinationDir, originalName]);
    return { ok: true };
  } catch (err) {
    const message = String(err.stderr || err.message);
    if (denied(message)) failNotAuthorized('Restoring');
    return { ok: false, reason: message.trim() };
  }
}

// A rename replaces an existing file silently, so the destination is checked
// first; something put there since the removal is never overwritten.
function directRestore(trashName, destination) {
  if (fs.existsSync(destination)) {
    return { ok: false, reason: `"${path.basename(destination)}" already exists in ${path.dirname(destination)}.` };
  }
  try {
    fs.renameSync(path.join(HOME_TRASH, trashName), destination);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function restoreFromTrash(trashName, destination) {
  if (!underHome(destination)) return finderRestore(trashName, destination);
  const direct = directRestore(trashName, destination);
  if (direct.ok || fs.existsSync(destination)) return direct;
  const viaFinder = await finderRestore(trashName, destination);
  return viaFinder.ok ? viaFinder : { ok: false, reason: `${direct.reason} / ${viaFinder.reason}` };
}

// Shared by every restore task. Each recorded item names where it came from
// and what it is called inside the Trash.
async function restoreItems(run, items) {
  const restored = [];
  const failed = [];

  for (const [index, item] of items.entries()) {
    run.progress(index + 1, items.length, item.from, 'path');
    const outcome = await restoreFromTrash(item.trashName, item.from);
    if (outcome.ok) {
      restored.push(item.from);
    } else {
      failed.push({ path: item.from, reason: outcome.reason });
      run.warn('RESTORE_FAILED', { path: item.from, reason: outcome.reason });
    }
  }

  return { restored, failed };
}

module.exports = { moveToTrash, restoreFromTrash, restoreItems };
