#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Produces the release artifact and the checksum a cask needs.
//
// ditto rather than zip, because the archive has to preserve the bundle's
// symlinks and resource forks. A plain zip flattens them and the application
// will not launch on the other side.

const ROOT = path.resolve(__dirname, '..');
const DISPLAY_NAME = 'Turink Toys';
const BUILD = path.join(ROOT, 'build');
const DIST = path.join(ROOT, 'dist');

function version() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
}

function main() {
  const bundle = path.join(BUILD, `${DISPLAY_NAME}.app`);
  if (!fs.existsSync(bundle)) {
    process.stderr.write('No bundle found. Run npm run bundle first.\n');
    process.exit(1);
  }

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const archive = path.join(DIST, `turink-toys-${version()}.zip`);
  execFileSync('/usr/bin/ditto', [
    '-c', '-k', '--sequesterRsrc', '--keepParent',
    bundle, archive,
  ]);

  const sha = execFileSync('/usr/bin/shasum', ['-a', '256', archive], { encoding: 'utf8' })
    .split(' ')[0];
  const bytes = fs.statSync(archive).size;

  fs.writeFileSync(
    path.join(DIST, 'checksum.txt'),
    `${sha}  ${path.basename(archive)}\n`
  );

  process.stdout.write(`${archive}\n`);
  process.stdout.write(`  ${(bytes / 1024 / 1024).toFixed(1)} MB\n`);
  process.stdout.write(`  sha256 ${sha}\n`);
}

main();
