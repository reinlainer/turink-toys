'use strict';

const { BrowserWindow, screen } = require('electron');

// The viewer is one window, reused for every photo, so opening another photo
// from Finder never leaves a trail of windows behind.
//
// Its size follows the "뷰어 창" setting. The page reports each photo's size
// once it has decoded it, and the size is worked out here because only the main
// process knows which screen the window is on.
//
//   first     fits the photo whenever the viewer is opened, then keeps its size
//             while the person pages through the folder
//   each      fits every photo as it is shown, keeping the window's centre
//   remember  opens at the size the person last gave it, whatever the photo

const MIN = { width: 420, height: 300 };
const SHARE = 0.8;
const BACKGROUND = '#0f1113';
// The window buttons sit centred on the page's 44 pt top bar.
const BUTTONS = { x: 16, y: 15 };

function createViewer({ preload, page, settings, onClosed }) {
  let win = null;
  let loaded = false;
  let queued = null;
  let fitNext = false;
  let current = null;

  const mode = () => settings.get('images.view', {}).windowSize || 'first';

  function make() {
    const remembered = settings.get('images.viewerSize', null);
    win = new BrowserWindow({
      width: remembered ? remembered.width : 960,
      height: remembered ? remembered.height : 640,
      minWidth: MIN.width,
      minHeight: MIN.height,
      show: false,
      titleBarStyle: 'hidden',
      trafficLightPosition: BUTTONS,
      backgroundColor: BACKGROUND,
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
    });
    // The window buttons sit over the photo, so they only appear with the rest
    // of the top edge.
    win.setWindowButtonVisibility(false);
    loaded = false;
    win.webContents.on('did-finish-load', () => {
      loaded = true;
      if (queued) win.webContents.send('viewer:load', queued);
      queued = null;
    });
    win.on('resized', () => {
      if (!win.isSimpleFullScreen()) {
        const [width, height] = win.getContentSize();
        settings.set('images.viewerSize', { width, height });
      }
    });
    win.on('closed', () => {
      win = null;
      onClosed(current);
    });
    win.loadFile(page);
  }

  function open(file, list) {
    current = file;
    fitNext = true;
    const payload = { file, list };
    if (!win) make();
    if (loaded) win.webContents.send('viewer:load', payload);
    else queued = payload;
    if (win.isVisible()) win.focus();
  }

  function areaNear(point) {
    return screen.getDisplayNearestPoint(point).workArea;
  }

  function fitted(natural, area) {
    const k = Math.min((area.width * SHARE) / natural.width, (area.height * SHARE) / natural.height, 1);
    return {
      width: Math.max(MIN.width, Math.round(natural.width * k)),
      height: Math.max(MIN.height, Math.round(natural.height * k)),
    };
  }

  function clampInto(bounds, area) {
    return {
      ...bounds,
      x: Math.round(Math.max(area.x, Math.min(area.x + area.width - bounds.width, bounds.x))),
      y: Math.round(Math.max(area.y, Math.min(area.y + area.height - bounds.height, bounds.y))),
    };
  }

  // Called when the page has the photo's own size.
  function shown(file, natural) {
    if (!win) return;
    current = file;
    if (win.isSimpleFullScreen()) {
      fitNext = false;
      return;
    }
    const how = mode();
    if (!win.isVisible()) {
      // A first appearance is centred on the screen the pointer is on.
      const area = areaNear(screen.getCursorScreenPoint());
      const remembered = settings.get('images.viewerSize', null);
      const size = how === 'remember' && remembered ? remembered : fitted(natural, area);
      win.setContentSize(size.width, size.height);
      const [width, height] = win.getSize();
      win.setBounds(clampInto({ width, height, x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2 }, area));
      win.show();
    } else if ((fitNext && how === 'first') || how === 'each') {
      // Resizes around its own centre rather than jumping back to the middle
      // of the screen.
      const old = win.getBounds();
      const area = areaNear({ x: old.x + old.width / 2, y: old.y + old.height / 2 });
      const size = fitted(natural, area);
      const bounds = clampInto(
        { ...size, x: old.x + (old.width - size.width) / 2, y: old.y + (old.height - size.height) / 2 },
        area
      );
      win.setBounds(bounds, true);
    }
    fitNext = false;
  }

  // macOS puts the buttons back in their default place when they are shown
  // again, so the position is set every time they appear.
  function showButtons(visible) {
    if (!win || win.isSimpleFullScreen()) return;
    win.setWindowButtonVisibility(Boolean(visible));
    if (visible) win.setWindowButtonPosition(BUTTONS);
  }

  // Simple full screen covers the current screen in place instead of moving
  // the window to a desktop of its own, which viewers are criticised for.
  function toggleFullScreen() {
    if (!win) return false;
    const next = !win.isSimpleFullScreen();
    win.setSimpleFullScreen(next);
    win.setWindowButtonVisibility(false);
    return next;
  }

  function close() {
    if (win) win.close();
  }

  return { open, shown, showButtons, toggleFullScreen, close, owns: (contents) => Boolean(win) && contents === win.webContents };
}

module.exports = { createViewer };
