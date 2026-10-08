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
  about: () => ipcRenderer.invoke('about:info'),
  openExternal: (url) => ipcRenderer.invoke('shell:external', url),

  onEvent: (handler) => ipcRenderer.on('run:event', (event, record) => handler(record)),
  onStarted: (handler) => ipcRenderer.on('run:started', (event, payload) => handler(payload)),
  onExternal: (handler) => ipcRenderer.on('run:external', (event, payload) => handler(payload)),
  onPrefill: (handler) => ipcRenderer.on('task:prefill', (event, payload) => handler(payload)),
  onFocusRun: (handler) => ipcRenderer.on('run:focus', (event, runId) => handler(runId)),
});
