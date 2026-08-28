#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { app, BrowserWindow } = require('electron');

// Rasterises the icon sources at every size macOS asks for and assembles the
// .icns. Electron is already a dependency and renders SVG correctly, which
// avoids adding an image toolchain the project would otherwise not need.

const ASSETS = path.resolve(__dirname, '..', 'packages', 'app', 'assets');
const OUT = path.join(ASSETS, 'generated');

const ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024];

// macOS names each entry by its point size and scale rather than by pixels.
const ICONSET = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
];

// One window is created and reused. Creating a transparent window per size
// fails after the first, and reusing it is faster besides.
let win = null;

function ensureWindow() {
  if (win) return win;
  win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
  });
  return win;
}

async function rasterise(svgPath, size) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}
svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;

  const temp = path.join(os.tmpdir(), `turink-icon-${process.pid}.html`);
  fs.writeFileSync(temp, page);

  const target = ensureWindow();
  target.setContentSize(size, size);
  await target.loadFile(temp);
  // One frame has to be painted before the capture returns pixels rather than
  // an empty surface.
  await new Promise((resolve) => setTimeout(resolve, 160));
  const image = await target.webContents.capturePage();
  fs.rmSync(temp, { force: true });
  return image.toPNG();
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const cache = new Map();
  for (const size of ICON_SIZES) {
    cache.set(size, await rasterise(path.join(ASSETS, 'icon.svg'), size));
    process.stdout.write(`icon ${size}\n`);
  }

  const iconset = path.join(OUT, 'icon.iconset');
  fs.mkdirSync(iconset, { recursive: true });
  for (const [name, size] of ICONSET) {
    fs.writeFileSync(path.join(iconset, name), cache.get(size));
  }

  execFileSync('/usr/bin/iconutil', [
    '--convert', 'icns',
    '--output', path.join(OUT, 'icon.icns'),
    iconset,
  ]);
  fs.rmSync(iconset, { recursive: true, force: true });
  fs.writeFileSync(path.join(OUT, 'icon.png'), cache.get(512));
  process.stdout.write('wrote icon.icns and icon.png\n');

  // The menu bar wants 22 points, so a plain and a retina copy are enough.
  for (const [name, size] of [['trayTemplate.png', 22], ['trayTemplate@2x.png', 44]]) {
    fs.writeFileSync(path.join(OUT, name), await rasterise(path.join(ASSETS, 'tray.svg'), size));
    process.stdout.write(`tray ${size}\n`);
  }

  if (win) win.destroy();
  app.quit();
}

app.whenReady().then(() =>
  main().catch((err) => {
    process.stderr.write(String(err && err.stack ? err.stack : err) + '\n');
    app.exit(1);
  })
);
