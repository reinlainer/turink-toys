'use strict';

const path = require('path');
const { execFile } = require('child_process');
const { Menu, ShareMenu, clipboard, nativeImage } = require('electron');

// Handing files to the rest of macOS: showing them in Finder, putting them on
// the clipboard so ⌘V in Finder or a messenger pastes the files themselves,
// the system Share menu, dragging them out, and the right-click menu that
// offers all of these. They act on a window rather than on the files'
// contents, so they live here and not among the core tasks.

// Electron can show only one item in Finder and no longer writes file
// references to the clipboard, so both go to AppKit through JavaScript for
// Automation. NSWorkspace selects the files in Finder without asking for
// permission to control Finder, as an Apple Event to Finder would.
const JXA = {
  reveal: `function run(argv) {
    ObjC.import('AppKit');
    const urls = argv.map((p) => $.NSURL.fileURLWithPath(p));
    $.NSWorkspace.sharedWorkspace.activateFileViewerSelectingURLs($(urls));
  }`,
  // The list goes in as one filenames property list, which macOS hands to
  // readers as one file URL per item. Writing the items one by one from this
  // short-lived process was not reliable: some were lost when it exited.
  copy: `function run(argv) {
    ObjC.import('AppKit');
    const board = $.NSPasteboard.generalPasteboard;
    board.clearContents;
    board.declareTypesOwner($(['NSFilenamesPboardType']), $());
    return board.setPropertyListForType($(argv), 'NSFilenamesPboardType') ? 'ok' : 'failed';
  }`,
};

function jxa(script, paths) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script, ...paths], { timeout: 15000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

const absolute = (paths) => (Array.isArray(paths) ? paths : [paths]).filter((p) => typeof p === 'string' && path.isAbsolute(p));

async function reveal(paths) {
  const list = absolute(paths);
  if (list.length) await jxa(JXA.reveal, list);
  return list.length;
}

async function copyFiles(paths) {
  const list = absolute(paths);
  if (!list.length) return 0;
  const result = await jxa(JXA.copy, list);
  if (result !== 'ok') throw new Error('The clipboard did not accept the files.');
  return list.length;
}

// One path per line, which is what Finder's Copy as Pathname gives for
// several items.
function copyPaths(paths) {
  const list = absolute(paths);
  clipboard.writeText(list.join('\n'));
  return list.length;
}

// A menu opens at the given point in the window, or at the pointer when none
// is given, which is where a right-click menu belongs.
const where = (at) => (at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: Math.round(at.x), y: Math.round(at.y) } : {});

function share(win, paths, at) {
  const list = absolute(paths);
  if (!list.length) return 0;
  const menu = new ShareMenu({ filePaths: list });
  menu.popup({ window: win, ...where(at) });
  return list.length;
}

// The drag image is the first item's own thumbnail, the way Finder shows what
// is being carried. A file Quick Look cannot draw falls back to the app icon.
async function startDrag(webContents, paths, fallbackIcon) {
  const list = absolute(paths);
  if (!list.length) return;
  let icon = null;
  try {
    icon = await nativeImage.createThumbnailFromPath(list[0], { width: 64, height: 64 });
  } catch {
    icon = null;
  }
  if (!icon || icon.isEmpty()) icon = nativeImage.createFromPath(fallbackIcon).resize({ width: 48, height: 48 });
  webContents.startDrag({ file: list[0], files: list, icon });
}

// The renderer describes the menu as plain data and learns which entry was
// chosen, so the actions themselves stay with the screen that owns the data.
// An entry is { id, label, accelerator, enabled, checked }, { type:
// 'separator' }, { header } for a greyed caption, or { share: [paths] } for the
// system Share submenu. Shortcuts are shown but not registered, since the
// screen already handles its own keys.
function popupMenu(win, entries, at) {
  return new Promise((resolve) => {
    let chosen = null;
    const toItem = (entry) => {
      if (entry.type === 'separator') return { type: 'separator' };
      if (entry.header) return { label: entry.header, enabled: false };
      if (entry.share) {
        return { label: entry.label, role: 'shareMenu', sharingItem: { filePaths: absolute(entry.share) } };
      }
      return {
        label: entry.label,
        enabled: entry.enabled !== false,
        type: entry.checked === undefined ? 'normal' : 'checkbox',
        checked: Boolean(entry.checked),
        accelerator: entry.accelerator || undefined,
        registerAccelerator: false,
        click: () => {
          chosen = entry.id;
        },
      };
    };
    const menu = Menu.buildFromTemplate(entries.map(toItem));
    menu.popup({
      window: win,
      ...where(at),
      // The click arrives before the menu reports it has closed, but only
      // just, so the answer waits one turn.
      callback: () => setImmediate(() => resolve(chosen)),
    });
  });
}

module.exports = { reveal, copyFiles, copyPaths, share, startDrag, popupMenu };
