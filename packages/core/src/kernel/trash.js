'use strict';

const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { fail } = require('./errors');

const exec = promisify(execFile);
const OSASCRIPT = '/usr/bin/osascript';

// The Trash is covered by macOS privacy protection, so an ordinary process can
// put items in but cannot list or read what is there. Moving in and out
// therefore goes through Finder, which holds the necessary access. macOS asks
// the user once to allow this tool to control Finder, and refusing leaves
// these operations unavailable without affecting anything else.
//
// Finder also raises the administrator prompt itself when an item belongs to
// another user, as applications installed from a package or the App Store do,
// so nothing here needs elevated rights of its own.

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
// from different folders often share a name. The name Finder reports back is
// therefore what gets recorded, so a later restore picks the right item.
async function moveToTrash(target) {
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

async function restoreFromTrash(trashName, destination) {
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
