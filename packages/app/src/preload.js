'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

// The renderer reaches the core only through these calls. Keeping node out of
// the page means a rendering bug cannot become filesystem access.
contextBridge.exposeInMainWorld('turink', {
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  strings: () => ipcRenderer.invoke('i18n:strings'),
  setLocale: (locale) => ipcRenderer.invoke('i18n:set', locale),
  runTask: (taskId, input, confirm) => ipcRenderer.invoke('task:run', { taskId, input, confirm }),
  peekTask: (taskId, input) => ipcRenderer.invoke('task:peek', { taskId, input }),
  runElevated: (taskId, input) => ipcRenderer.invoke('task:runElevated', { taskId, input }),
  listUndoable: (taskId) => ipcRenderer.invoke('runs:undoable', taskId),
  appIcon: (appPath) => ipcRenderer.invoke('apps:icon', appPath),
  // Electron no longer puts a path on a dropped File, so it is asked for here.
  pathForFile: (file) => webUtils.getPathForFile(file),
  pickPaths: (directory) => ipcRenderer.invoke('dialog:pick', { directory }),
  loadOptions: (source) => ipcRenderer.invoke('options:load', source),
  rememberTask: (taskId) => ipcRenderer.invoke('settings:lastTask', taskId),
  listRuns: () => ipcRenderer.invoke('runs:list'),
  readRun: (runId) => ipcRenderer.invoke('runs:read', runId),
  reveal: (target) => ipcRenderer.invoke('shell:reveal', target),
  revealFiles: (paths) => ipcRenderer.invoke('files:reveal', paths),
  copyFiles: (paths) => ipcRenderer.invoke('files:copy', paths),
  copyPaths: (paths) => ipcRenderer.invoke('files:copyPaths', paths),
  shareFiles: (paths, at) => ipcRenderer.invoke('files:share', { paths, at }),
  fileMenu: (entries, at) => ipcRenderer.invoke('files:menu', { entries, at }),
  // A drag has to start while the mouse is still down, so this one is sent
  // rather than awaited.
  dragFiles: (paths) => ipcRenderer.send('files:drag', paths),
  about: () => ipcRenderer.invoke('about:info'),
  loginItem: () => ipcRenderer.invoke('login:get'),
  setLoginItem: (enabled) => ipcRenderer.invoke('login:set', enabled),
  openExternal: (url) => ipcRenderer.invoke('shell:external', url),
  openSettings: (pane) => ipcRenderer.invoke('shell:settings', pane),

  // Images screen and viewer window.
  imagesInitial: () => ipcRenderer.invoke('images:initial'),
  rememberImagesFolder: (folder) => ipcRenderer.invoke('images:remember', folder),
  watchImagesFolder: (folder) => ipcRenderer.invoke('images:watch', folder),
  imagesView: () => ipcRenderer.invoke('images:view'),
  setImagesView: (view) => ipcRenderer.invoke('images:setView', view),
  imageFacts: (file) => ipcRenderer.invoke('images:facts', file),
  openDefault: (file) => ipcRenderer.invoke('images:openDefault', file),
  openViewer: (file, list) => ipcRenderer.invoke('viewer:open', { file, list }),
  viewerShown: (file, width, height) => ipcRenderer.invoke('viewer:shown', { file, width, height }),
  viewerChrome: (visible) => ipcRenderer.invoke('viewer:chrome', visible),
  viewerFullScreen: () => ipcRenderer.invoke('viewer:fullscreen'),
  closeViewer: () => ipcRenderer.invoke('viewer:close'),
  onImagesShow: (handler) => ipcRenderer.on('images:show', (event, folder) => handler(folder)),
  onImagesChanged: (handler) => ipcRenderer.on('images:changed', (event, folder) => handler(folder)),
  onImagesView: (handler) => ipcRenderer.on('images:view', (event, view) => handler(view)),
  onViewerLoad: (handler) => ipcRenderer.on('viewer:load', (event, payload) => handler(payload)),
  onViewerClosed: (handler) => ipcRenderer.on('viewer:closed', (event, file) => handler(file)),

  onEvent: (handler) => ipcRenderer.on('run:event', (event, record) => handler(record)),
  onStarted: (handler) => ipcRenderer.on('run:started', (event, payload) => handler(payload)),
  onExternal: (handler) => ipcRenderer.on('run:external', (event, payload) => handler(payload)),
  onPrefill: (handler) => ipcRenderer.on('task:prefill', (event, payload) => handler(payload)),
  onLoginItem: (handler) => ipcRenderer.on('login:changed', (event, state) => handler(state)),
  onFocusRun: (handler) => ipcRenderer.on('run:focus', (event, runId) => handler(runId)),
  onFoldersChanged: (handler) => ipcRenderer.on('folders:changed', () => handler()),
  onShowScreen: (handler) => ipcRenderer.on('screen:show', (event, id) => handler(id)),
});
