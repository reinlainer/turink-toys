#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Compiles the native helpers listed in packages/core/native/helpers.json into
// the build folder named by native/helpers.js, where the core looks for them
// and from where the bundle copies them.
//
// Each helper is wrapped in a minimal background-only application bundle. macOS
// lists a bare executable by its file name in Privacy & Security and Login
// Items; a bundle shows there under the product name and icon instead, so the
// person can tell what they are granting.
//
// Only the Swift compiler from the Command Line Tools is needed, so no Xcode
// project exists. The people installing the application never compile
// anything: the release bundle carries the compiled helpers.

const ROOT = path.resolve(__dirname, '..');
const NATIVE = path.join(ROOT, 'packages', 'core', 'native');
const { BUILD: OUT, HELPERS } = require(path.join(NATIVE, 'helpers.js'));
const ICON = path.join(ROOT, 'packages', 'app', 'assets', 'generated', 'icon.icns');

function sourceVersion(source) {
  const match = /^let VERSION = "([^"]+)"/m.exec(fs.readFileSync(source, 'utf8'));
  if (!match) throw new Error(`${source} declares no VERSION`);
  return match[1];
}

function infoPlist(helper, version) {
  const entries = {
    CFBundleExecutable: helper.executable,
    CFBundleIdentifier: helper.identifier,
    CFBundleName: helper.name,
    CFBundleDisplayName: helper.name,
    CFBundleIconFile: 'icon',
    CFBundlePackageType: 'APPL',
    CFBundleShortVersionString: version,
    CFBundleVersion: version,
    LSMinimumSystemVersion: '11.0',
    LSBackgroundOnly: true,
  };
  const body = Object.entries(entries)
    .map(([key, value]) => `  <key>${key}</key>\n  ${value === true ? '<true/>' : `<string>${value}</string>`}`)
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

function build(helper) {
  const source = path.join(NATIVE, helper.source);
  const bundle = path.join(OUT, `${helper.name}.app`);
  const contents = path.join(bundle, 'Contents');

  fs.rmSync(bundle, { recursive: true, force: true });
  fs.mkdirSync(path.join(contents, 'MacOS'), { recursive: true });
  fs.mkdirSync(path.join(contents, 'Resources'), { recursive: true });

  execFileSync(
    '/usr/bin/swiftc',
    ['-O', '-swift-version', '5', '-o', path.join(contents, 'MacOS', helper.executable), source],
    { stdio: 'inherit' }
  );
  fs.writeFileSync(path.join(contents, 'Info.plist'), infoPlist(helper, sourceVersion(source)));
  if (fs.existsSync(ICON)) {
    fs.copyFileSync(ICON, path.join(contents, 'Resources', 'icon.icns'));
  } else {
    process.stderr.write('icon.icns is missing, so the helper has no icon. Run npm run icons first.\n');
  }
  execFileSync('/usr/bin/codesign', ['--force', '--sign', '-', bundle], { stdio: 'ignore' });
  process.stdout.write(`Built ${path.relative(ROOT, bundle)}\n`);
}

function main() {
  if (process.platform !== 'darwin') {
    process.stdout.write('Native helpers are built on macOS only. Skipped.\n');
    return;
  }
  // Output from before the helpers were bundled would otherwise linger.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const helper of HELPERS) build(helper);
}

main();
