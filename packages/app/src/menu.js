'use strict';

const { app, Menu, shell } = require('electron');

// Electron installs a default menu carrying Reload and Toggle Developer Tools.
// Those belong to a development session rather than to a shipped utility, so
// the menu is built here instead. Edit is kept because the window has text
// fields and the system shortcuts stop working without it.

function build(t, onOpenWindow, onAbout) {
  const name = app.getName();

  const template = [
    {
      label: name,
      submenu: [
        { label: t('menu.about', `About ${name}`, { name }), click: onAbout },
        { type: 'separator' },
        { role: 'hide', label: t('menu.hide', `Hide ${name}`, { name }) },
        { role: 'hideOthers', label: t('menu.hideOthers', 'Hide Others') },
        { role: 'unhide', label: t('menu.showAll', 'Show All') },
        { type: 'separator' },
        { role: 'quit', label: t('menu.quit', `Quit ${name}`, { name }) },
      ],
    },
    {
      label: t('menu.edit', 'Edit'),
      submenu: [
        { role: 'undo', label: t('menu.undo', 'Undo') },
        { role: 'redo', label: t('menu.redo', 'Redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menu.cut', 'Cut') },
        { role: 'copy', label: t('menu.copy', 'Copy') },
        { role: 'paste', label: t('menu.paste', 'Paste') },
        { role: 'selectAll', label: t('menu.selectAll', 'Select All') },
      ],
    },
    {
      label: t('menu.window', 'Window'),
      submenu: [
        {
          label: t('menu.mainWindow', `${name} Window`, { name }),
          accelerator: 'CmdOrCtrl+0',
          click: onOpenWindow,
        },
        { type: 'separator' },
        { role: 'minimize', label: t('menu.minimize', 'Minimize') },
        { role: 'zoom', label: t('menu.zoom', 'Zoom') },
        { role: 'close', label: t('menu.close', 'Close') },
        { type: 'separator' },
        { role: 'front', label: t('menu.bringAllToFront', 'Bring All to Front') },
      ],
    },
    {
      label: t('menu.help', 'Help'),
      submenu: [
        {
          label: t('menu.repository', 'Project page'),
          click: () => shell.openExternal('https://github.com/reinlainer/turink-toys'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { build };
