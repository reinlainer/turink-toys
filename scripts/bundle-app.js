#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Builds a real .app around the Electron binary.
//
// macOS reads the application menu title, the Dock name and the About panel
// from the running bundle's CFBundleName. Running the sources through the
// electron command means the running bundle is Electron's own, so the menu says
// "Electron" no matter what app.setName reports. Only an actual bundle fixes
// that, which is why this exists before the packaging step proper.
//
// Nothing here is a substitute for a release build. It produces an unsigned
// bundle for local use and takes no dependency beyond what is already
// installed.

const ROOT = path.resolve(__dirname, '..');
// The identifier keeps the hyphenated form, because that is what the repository
// is called and what the command line tool is named. Everything macOS shows a
// person uses the written-out name.
//
// The bundle file has to carry it too: the Dock label and the Finder name come
// from the file name before CFBundleDisplayName is consulted. The launcher
// follows the same convention as installed applications, whose executables are
// named "Google Chrome" and "Cursor" rather than after a package. The CLI
// inside Resources stays "turink-toys", since that is what gets typed.
const CLI_NAME = 'turink-toys';
const DISPLAY_NAME = 'Turink Toys';
const BUNDLE_ID = 'toys.turink.app';

const OUT = path.join(ROOT, 'build');
const BUNDLE = path.join(OUT, `${DISPLAY_NAME}.app`);
const SOURCE = path.join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app');

function version() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
}

function plist(fields) {
  const body = Object.entries(fields)
    .map(([key, value]) =>
      typeof value === 'boolean'
        ? `  <key>${key}</key>\n  <${value}/>`
        : `  <key>${key}</key>\n  <string>${value}</string>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${body}
</dict>
</plist>
`;
}

// Only the workspace packages the application actually loads are copied. Pulling
// in the whole tree would carry Electron itself into its own bundle.
function copyRuntime(target) {
  const appDir = path.join(target, 'Contents', 'Resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });

  for (const name of ['core', 'cli', 'app']) {
    fs.cpSync(path.join(ROOT, 'packages', name), path.join(appDir, 'packages', name), {
      recursive: true,
    });
  }

  for (const dep of ['yauzl', 'yazl', 'fd-slicer', 'pend', 'buffer-crc32']) {
    const from = path.join(ROOT, 'node_modules', dep);
    if (fs.existsSync(from)) {
      fs.cpSync(from, path.join(appDir, 'node_modules', dep), { recursive: true });
    }
  }
  // The workspace resolves @turink/* through symlinks that do not survive the
  // copy, so the link is recreated inside the bundle.
  const scoped = path.join(appDir, 'node_modules', '@turink');
  fs.mkdirSync(scoped, { recursive: true });
  for (const name of ['core', 'cli']) {
    const link = path.join(scoped, name);
    fs.rmSync(link, { recursive: true, force: true });
    fs.symlinkSync(path.join('..', '..', 'packages', name), link);
  }

  fs.writeFileSync(
    path.join(appDir, 'package.json'),
    JSON.stringify(
      {
        name: CLI_NAME,
        productName: DISPLAY_NAME,
        version: version(),
        main: 'packages/app/src/main.js',
      },
      null,
      2
    ) + '\n'
  );
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    process.stderr.write('Electron is not installed. Run npm install first.\n');
    process.exit(1);
  }

  fs.rmSync(BUNDLE, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.cpSync(SOURCE, BUNDLE, { recursive: true, verbatimSymlinks: true });

  // The launcher has to match CFBundleExecutable, so it is renamed rather than
  // left as "Electron".
  const macos = path.join(BUNDLE, 'Contents', 'MacOS');
  fs.renameSync(path.join(macos, 'Electron'), path.join(macos, DISPLAY_NAME));

  const icons = path.join(ROOT, 'packages', 'app', 'assets', 'generated', 'icon.icns');
  if (fs.existsSync(icons)) {
    fs.copyFileSync(icons, path.join(BUNDLE, 'Contents', 'Resources', 'icon.icns'));
  } else {
    process.stderr.write('icon.icns is missing. Run npm run icons first.\n');
  }
  fs.rmSync(path.join(BUNDLE, 'Contents', 'Resources', 'electron.icns'), { force: true });

  fs.writeFileSync(
    path.join(BUNDLE, 'Contents', 'Info.plist'),
    plist({
      CFBundleName: DISPLAY_NAME,
      CFBundleDisplayName: DISPLAY_NAME,
      CFBundleExecutable: DISPLAY_NAME,
      CFBundleIdentifier: BUNDLE_ID,
      CFBundleIconFile: 'icon',
      CFBundlePackageType: 'APPL',
      CFBundleShortVersionString: version(),
      CFBundleVersion: version(),
      CFBundleInfoDictionaryVersion: '6.0',
      LSMinimumSystemVersion: '11.0',
      NSHighResolutionCapable: true,
      // The window and the menu bar item are the interface. A Dock tile is
      // still wanted, so the app is not declared an agent.
      LSApplicationCategoryType: 'public.app-category.utilities',
    })
  );

  copyRuntime(BUNDLE);

  // Rewriting the bundle invalidates Electron's signature, and an arm64 binary
  // will not launch unsigned. Re-signing ad hoc is what makes it runnable.
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', BUNDLE], {
    stdio: 'inherit',
  });

  process.stdout.write(`Built ${BUNDLE}\n`);
  process.stdout.write('Unsigned and not notarised. For local use only.\n');
}

main();
