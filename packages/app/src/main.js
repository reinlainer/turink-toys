'use strict';

const path = require('path');
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage, nativeTheme } = require('electron');
const core = require('@turink/core');
const watcher = require('./watcher');
const appMenu = require('./menu');
const updates = require('./updates');
const UI_STRINGS = require('./strings');

const ASSETS = path.join(__dirname, '..', 'assets', 'generated');

// Running from source, app.getVersion() reports Electron's own version because
// there is no application package.json above it. Reading ours directly gives
// the same answer in both cases.
const VERSION = require('../package.json').version;

const { registry, execute, journal, errors, i18n, settings, present } = core;
const { validateInput } = require('@turink/core/src/kernel/manifest');
const { execFile } = require('child_process');
const execFileAsync = require('util').promisify(execFile);

// The identifier and the executable stay hyphenated because a command is typed
// and a bundle is addressed by it. What a person reads is written out in full.
const DISPLAY_NAME = 'Turink Toys';

// Running from source, Electron names the application after its own binary.
// Setting the name here is what puts the product in the About panel instead of
// "Electron"; the menu bar title comes from the bundle and needs a real build.
app.setName(DISPLAY_NAME);

let locale = 'en';

let mainWindow = null;
let aboutWindow = null;
let tray = null;
let updateAvailable = null;
const localRuns = new Set();

// The window calls the same core functions the command line does. Nothing here
// reimplements a task, so a safety gate cannot be bypassed by using the app
// instead of the terminal.

function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 820,
    minHeight: 580,
    titleBarStyle: 'hiddenInset',
    // Matches the page's own window colour so no flash shows before it paints.
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#17191c' : '#f4f5f7',
    icon: path.join(ASSETS, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  return mainWindow;
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

const HOMEPAGE = 'https://turink.com';
const SOURCE = 'https://github.com/reinlainer/turink-toys';

// Electron's built-in About panel takes plain text only, so it cannot carry a
// link anyone can follow. A small window of our own can.
function openAbout() {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 340,
    height: 420,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  aboutWindow.setMenu(null);
  aboutWindow.loadFile(path.join(__dirname, 'renderer', 'about.html'));
  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}

// ---------------------------------------------------------------- tray

async function powerSummary() {
  try {
    const outcome = await execute.runTask('power.status', {}, { source: 'app', ephemeral: true });
    return outcome.result;
  } catch {
    return null;
  }
}

async function buildTrayMenu() {
  const status = await powerSummary();
  const active = journal.list({ activeOnly: true, limit: 5 });

  const items = [];

  if (active.length > 0) {
    items.push({ label: 'Running', enabled: false });
    for (const run of active) {
      items.push({
        label: `  ${run.task}`,
        click: () => {
          createWindow();
          send('run:focus', run.run);
        },
      });
    }
    items.push({ type: 'separator' });
  }

  if (status) {
    items.push({
      label: status.lidSleepDisabled
        ? 'Lid closed: staying awake'
        : 'Lid closed: sleeps normally',
      enabled: false,
    });
    if (status.keepAwake.active) {
      items.push({
        label: `  Idle sleep suppressed, ${status.keepAwake.minutesLeft} min left`,
        enabled: false,
      });
    }
    items.push({ type: 'separator' });
  }

  if (updateAvailable) {
    items.push(
      {
        label: i18n.t(locale, 'update.available', 'Version {version} is available', {
          version: updateAvailable.version,
        }),
        click: () => shell.openExternal(updateAvailable.url || SOURCE),
      },
      { type: 'separator' }
    );
  }

  items.push(
    { label: i18n.t(locale, 'menu.mainWindow', `${DISPLAY_NAME} Window`, { name: DISPLAY_NAME }), click: () => createWindow() },
    { label: i18n.t(locale, 'menu.about', `About ${DISPLAY_NAME}`, { name: DISPLAY_NAME }), click: () => openAbout() },
    {
      // The task's own title, the same one the Finder quick action shows. Menu
      // entries naming a task stay English so one name reaches every surface.
      // The ellipsis marks the file picker this entry opens before anything runs.
      label: `${registry.get('archive.compress').title}…`,
      click: async () => {
        const picked = await dialog.showOpenDialog({
          properties: ['openFile', 'openDirectory', 'multiSelections'],
        });
        if (picked.canceled || picked.filePaths.length === 0) return;
        createWindow();
        send('task:prefill', { task: 'archive.compress', input: { targets: picked.filePaths } });
      },
    },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  );

  return Menu.buildFromTemplate(items);
}

async function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(await buildTrayMenu());
}

function createTray() {
  // A template image lets macOS invert the mark for a light or dark menu bar
  // and dim it when the application is not frontmost. Naming the file
  // "Template" is what switches that behaviour on.
  const icon = nativeImage.createFromPath(path.join(ASSETS, 'trayTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip(DISPLAY_NAME);
  refreshTray();
  // The menu is rebuilt on open so the power state and running list are current
  // rather than whatever they were when the app launched.
  tray.on('mouse-down', refreshTray);
}

function buildMenu() {
  appMenu.build(
    (key, fallback, params) => i18n.t(locale, key, fallback, params),
    () => createWindow(),
    () => openAbout()
  );
}

// ---------------------------------------------------------------- ipc

function taskPayload() {
  return registry.all().map((task) => {
    const shown = i18n.localizeTask(task, locale);
    return {
      id: task.id,
      domain: task.domain,
      title: shown.title,
      summary: shown.summary,
      whenToUse: shown.whenToUse,
      risk: task.risk,
      cost: task.cost,
      input: shown.input,
      accepts: task.accepts,
      examples: task.examples,
    };
  });
}

ipcMain.handle('tasks:list', () => taskPayload());

ipcMain.handle('i18n:strings', () => ({
  locale,
  available: i18n.available(),
  ui: buildUiStrings(),
  lastTask: settings.get('lastTask', null),
}));

ipcMain.handle('i18n:set', (event, next) => {
  locale = i18n.normalize(next);
  settings.set('locale', locale);
  buildMenu();
  refreshTray();
  return { locale, ui: buildUiStrings(), tasks: taskPayload() };
});

// Mirrors the English tree with each leaf resolved in the active locale.
function localizeTree(node, prefix) {
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    const path = `${prefix}.${key}`;
    out[key] = typeof value === 'string' ? i18n.t(locale, path, value) : localizeTree(value, path);
  }
  return out;
}

// The window renders no English literals of its own. Every label it draws comes
// from here, so adding a language is a locale file rather than a sweep through
// the markup.
function buildUiStrings() {
  const ui = localizeTree(UI_STRINGS, 'ui');

  ui.domain = {};
  for (const domain of new Set(registry.all().map((task) => task.domain))) {
    ui.domain[domain] = i18n.t(locale, `domain.${domain}`, domain);
  }
  return ui;
}

ipcMain.handle('task:run', async (event, { taskId, input, confirm }) => {
  try {
    const outcome = await execute.runTask(taskId, input, {
      source: 'app',
      confirm: confirm || null,
      onStart: (runId) => {
        localRuns.add(runId);
        send('run:started', { runId, taskId });
      },
      onEvent: (record) => send('run:event', record),
    });
    refreshTray();
    return {
      ok: true,
      ...outcome,
      shown: present.present(
        registry.get(taskId),
        outcome.result,
        (key, fallback, params) => i18n.t(locale, key, fallback, params)
      ),
    };
  } catch (err) {
    const payload =
      err instanceof errors.TaskError
        ? err.toJSON()
        : { code: 'FAILED', message: err.message, retryable: false };
    return {
      ok: false,
      error: i18n.localizeError(payload, locale),
      plan: err.payload?.plan || null,
      runId: err.runId || null,
    };
  }
});

// Resolves a field's declared option source. The referenced task runs through
// the same core as everything else, so the choices a person sees are the ones
// the command would accept, not a second list kept in step by hand.
ipcMain.handle('options:load', async (event, source) => {
  try {
    if (source.runs) {
      return journal
        .list({ limit: 40 })
        .filter((run) => run.task === source.runs && run.status === 'ok')
        .map((run) => {
          const events = journal.read(run.run) || [];
          const end = events.find((e) => e.event === 'run.end');
          const result = end && end.result;
          if (!result || !result.restorable) return null;
          return {
            value: run.run,
            label: new Date(run.startedAt).toLocaleString(),
            note: `${result.freedReadable || ''} (${(result.trashed || []).length})`,
          };
        })
        .filter(Boolean);
    }

    const outcome = await execute.runTask(source.task, {}, { source: 'app', ephemeral: true });
    const list = outcome.result[source.list] || [];
    // Catalogue entries are data rather than interface text, so their names
    // are translated here by slug where a translation exists.
    return list.map((entry) => {
      const value = entry[source.value];
      return {
        value,
        label: i18n.t(locale, `target.${value}.name`, entry[source.label] ?? value),
        group: source.group ? entry[source.group] : null,
        badge: source.badge ? entry[source.badge] : null,
        note: source.note ? i18n.t(locale, `target.${value}.note`, entry[source.note]) : null,
      };
    });
  } catch {
    return [];
  }
});

ipcMain.handle('dialog:pick', async (event, { directory }) => {
  const picked = await dialog.showOpenDialog({
    properties: directory
      ? ['openDirectory', 'multiSelections']
      : ['openFile', 'openDirectory', 'multiSelections'],
  });
  return picked.canceled ? [] : picked.filePaths;
});

ipcMain.handle('about:info', () => ({
  name: DISPLAY_NAME,
  version: VERSION,
  platform: `${process.platform === 'darwin' ? 'macOS' : process.platform} ${process.arch}`,
  tagline: i18n.t(
    locale,
    'about.tagline',
    'macOS utilities that people and AI agents drive through the same core.'
  ),
  labels: {
    homepage: i18n.t(locale, 'about.homepage', 'Homepage'),
    source: i18n.t(locale, 'about.source', 'Source'),
  },
  license: i18n.t(locale, 'about.license', 'MIT licensed. Free and open source.'),
  homepage: HOMEPAGE,
  source: SOURCE,
  update: updateAvailable
    ? {
        version: updateAvailable.version,
        label: i18n.t(locale, 'update.available', 'Version {version} is available', {
          version: updateAvailable.version,
        }),
        command: 'brew upgrade --cask turink-toys',
      }
    : null,
  icon: nativeImage
    .createFromPath(path.join(ASSETS, 'icon.png'))
    .resize({ width: 176, height: 176 })
    .toDataURL(),
}));

ipcMain.handle('shell:external', (event, url) => {
  // Only the two addresses this application owns are ever opened, so a page
  // cannot turn this into a way to launch arbitrary links.
  if (url === HOMEPAGE || url === SOURCE) shell.openExternal(url);
});

// Reading state a screen shows, such as the application list or the power
// settings, is not something a person did, so it leaves no journal entry. The
// core only honours this for read-only tasks.
ipcMain.handle('task:peek', async (event, { taskId, input }) => {
  try {
    const outcome = await execute.runTask(taskId, input || {}, { source: 'app', ephemeral: true });
    return { ok: true, ...outcome };
  } catch (err) {
    const payload = err instanceof errors.TaskError ? err.toJSON() : { code: 'FAILED', message: err.message };
    return { ok: false, error: i18n.localizeError(payload, locale) };
  }
});

ipcMain.handle('runs:list', () => journal.list({ limit: 30 }));

// The task that undoes each undoable one.
const UNDO_TASK = { 'disk.clean': 'disk.restore', 'apps.uninstall': 'apps.restore' };

function runResult(runId) {
  const end = (journal.read(runId) || []).find((e) => e.event === 'run.end');
  return end && end.result;
}

// Completed runs of a task whose result can still be undone, newest first, with
// what a list row needs to describe them. A run already put back by a later
// restore is left out, so the list only offers what is still in the Trash.
ipcMain.handle('runs:undoable', (event, taskId) => {
  const runs = journal.list({ limit: 80 });
  const undone = new Set(
    runs
      .filter((run) => run.task === UNDO_TASK[taskId] && run.status === 'ok')
      .map((run) => (runResult(run.run) || {}).sourceRun)
      .filter(Boolean)
  );
  return runs
    .filter((run) => run.task === taskId && (run.status === 'ok' || run.status === 'partial'))
    .filter((run) => !undone.has(run.run))
    .map((run) => {
      const result = runResult(run.run);
      if (!result || !result.restorable) return null;
      return {
        run: run.run,
        startedAt: run.startedAt,
        count: (result.trashed || []).length,
        bytes: result.freedBytes || 0,
        apps: result.apps || null,
        names: (result.trashed || []).map((item) => item.slug || item.app).filter(Boolean),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
});

const iconCache = new Map();
ipcMain.handle('apps:icon', async (event, appPath) => {
  if (typeof appPath !== 'string' || !appPath.endsWith('.app')) return null;
  if (iconCache.has(appPath)) return iconCache.get(appPath);
  try {
    // The Quick Look thumbnail of a bundle is its own icon. app.getFileIcon
    // returns the generic application icon for every bundle, and its 'large'
    // size crashes Electron 44. 64 pixels is the 32-point row at 2x.
    const image = await nativeImage.createThumbnailFromPath(appPath, { width: 64, height: 64 });
    const url = image.isEmpty() ? null : image.toDataURL();
    iconCache.set(appPath, url);
    return url;
  } catch {
    return null;
  }
});

// The few tasks that change system settings need root. The window cannot host
// sudo, so the command line runs under macOS's own administrator prompt. Only
// tasks listed here can go this way, and their input is validated against the
// manifest before anything is put on a command line.
const ELEVATED = new Set(['power.lid']);

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

ipcMain.handle('task:runElevated', async (event, { taskId, input }) => {
  const task = registry.get(taskId);
  const t = (key, fallback, params) => i18n.t(locale, key, fallback, params);
  if (!ELEVATED.has(taskId)) {
    return { ok: false, error: { code: 'FAILED', message: `${taskId} does not run with administrator rights.` } };
  }

  let checked;
  try {
    checked = validateInput(task, input || {});
  } catch (err) {
    return { ok: false, error: i18n.localizeError(err.toJSON ? err.toJSON() : { code: 'FAILED', message: err.message }, locale) };
  }

  const args = [taskId];
  for (const [name, value] of Object.entries(checked)) {
    args.push(`--${name.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase())}=${value}`);
  }
  args.push('--json');

  const cli = path.join(__dirname, '..', '..', 'cli', 'src', 'main.js');
  const command = `ELECTRON_RUN_AS_NODE=1 ${[process.execPath, cli, ...args].map(shellQuote).join(' ')}`;
  const script = `do shell script "${command.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" with administrator privileges`;

  try {
    const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', script]);
    const line = stdout.trim().split('\n').pop();
    const outcome = JSON.parse(line);
    refreshTray();
    if (outcome.status === 'error' || outcome.error) {
      return { ok: false, error: i18n.localizeError(outcome.error, locale) };
    }
    return { ok: true, ...outcome, shown: present.present(task, outcome.result, t) };
  } catch (err) {
    const message = String(err.stderr || err.message);
    if (message.includes('-128')) return { ok: false, cancelled: true };
    // A failed run still prints its JSON before exiting non-zero.
    const line = String(err.stdout || '').trim().split('\n').pop();
    try {
      const outcome = JSON.parse(line);
      if (outcome.error) return { ok: false, error: i18n.localizeError(outcome.error, locale) };
    } catch {
      // Not JSON; report the raw message below.
    }
    return { ok: false, error: { code: 'FAILED', message: message.trim() } };
  }
});
ipcMain.handle('settings:lastTask', (event, taskId) => {
  if (taskId) settings.set('lastTask', taskId);
  return settings.get('lastTask', null);
});
ipcMain.handle('runs:read', (event, runId) => journal.read(runId));
ipcMain.handle('shell:reveal', (event, target) => shell.showItemInFolder(target));

// ---------------------------------------------------------------- lifecycle

app.whenReady().then(() => {
  // Running from source shows a generic Electron icon in the Dock unless the
  // image is set explicitly. A packaged build takes it from the bundle instead.
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(path.join(ASSETS, 'icon.png')));
  }

  // A saved choice wins over the system language, which is what makes the
  // selector in the window behave like a setting rather than a session toggle.
  locale = i18n.detect({ saved: settings.get('locale'), system: app.getLocale() });
  buildMenu();
  createWindow();
  createTray();

  // A run started from the command line or a quick action writes to the same
  // journal directory. Watching it is what lets someone see an agent working
  // while the app is open.
  // Checked once a day at most, and never blocking startup. A machine with no
  // network simply carries on.
  updates.check(VERSION).then((found) => {
    if (!found) return;
    updateAvailable = found;
    refreshTray();
    send('update:available', found);
  });

  watcher.watchRuns(
    (update) => {
      send('run:external', update);
      refreshTray();
    },
    (runId) => localRuns.has(runId)
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// The tray is the primary surface, so closing the window leaves the app running
// rather than quitting it.
app.on('window-all-closed', () => {});
