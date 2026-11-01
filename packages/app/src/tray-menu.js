'use strict';

const folderNames = require('./renderer/folder-names');

// The menu bar menu, kept apart from Electron so its contents can be tested
// without a running app. It is English in every locale, like the macOS menu
// bar extras it sits beside; folder names are the person's own.

const PLACE_NAMES = {
  desktop: 'Desktop',
  documents: 'Documents',
  downloads: 'Downloads',
  home: 'Home',
  icloud: 'iCloud Drive',
  onedrive: 'OneDrive',
  gdrive: 'Google Drive',
  dropbox: 'Dropbox',
  disk: 'Macintosh HD',
};

function folderItem(folder, actions) {
  return {
    label: folderNames.shownName(folder, PLACE_NAMES),
    sublabel: folder.available ? folderNames.whereLine(folder, PLACE_NAMES) : 'Not connected',
    toolTip: folder.path,
    enabled: folder.available,
    click: () => actions.open(folder),
  };
}

// Saved folders sit in their own submenu so the top level stays short. A
// folder that cannot be reached is shown but cannot be chosen. Groups become
// headings inside that one submenu rather than submenus of their own, so any
// folder is still two clicks away; a group with no folders is left out.
function template(folders, groups, actions, appName) {
  const items = folders.filter((folder) => !folder.group).map((folder) => folderItem(folder, actions));
  for (const group of groups) {
    const members = folders.filter((folder) => folder.group === group.name);
    if (members.length === 0) continue;
    if (items.length > 0) items.push({ type: 'separator' });
    items.push({ label: group.name, type: 'header' });
    for (const folder of members) items.push(folderItem(folder, actions));
  }
  if (items.length === 0) items.push({ label: 'No folders yet', enabled: false });

  return [
    {
      label: 'Folders',
      submenu: [
        ...items,
        { type: 'separator' },
        { label: 'Add Folder…', click: () => actions.add() },
        { label: 'Edit Folders…', click: () => actions.edit() },
      ],
    },
    { type: 'separator' },
    { label: `Open ${appName}`, click: () => actions.window() },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' },
  ];
}

module.exports = { template, PLACE_NAMES };
