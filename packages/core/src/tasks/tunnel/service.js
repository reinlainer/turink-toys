'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { fail } = require('../../kernel/errors');

const exec = promisify(execFile);

// The proxy tunnel sends all of the Mac's traffic through a SOCKS5 proxy while
// that proxy can be reached. Changing routes and DNS needs root, so a launchd
// daemon does it; the daemon is installed once, under the macOS administrator
// prompt, and from then on the person only flips a setting.
//
// The folder is root-owned and readable by everyone. The one file inside it
// that the person may write is the settings file, owned by them, which is how
// the window and the command line change the tunnel without a password. The
// daemon checks every value it reads from that file (see tunneld).

const LABEL = 'com.turink.toys.tunnel';
const DIR = '/Library/Application Support/turink-toys/tunnel';
const PLIST = `/Library/LaunchDaemons/${LABEL}.plist`;

// DirectBridge, the Android app this feature grew out of, serves its HTTP
// proxy and SOCKS5 together on this port of the Wi-Fi Direct network its phone
// opens, telling them apart by the first byte.
const DEFAULTS = { server: '192.168.49.1', port: 8282 };

const TUN2SOCKS = {
  version: 'v2.7.0',
  url: 'https://github.com/xjasonlyu/tun2socks/releases/download/v2.7.0/tun2socks-darwin-arm64.zip',
  sha256: '7c5ebfe2ffb60ecf6e958cc5bbf3e06e74b8b33575ffbb4ba4f6f785a647f1ad',
};

// A status file older than this means the daemon has stopped writing it.
const STALE_MS = 30000;
const DOWNLOAD_TIMEOUT_MS = 60000;

function layout(dir = DIR) {
  return {
    dir,
    config: path.join(dir, 'config'),
    status: path.join(dir, 'status.json'),
    daemon: path.join(dir, 'tunneld'),
    tun2socks: path.join(dir, 'tun2socks'),
    plist: PLIST,
    bundledDaemon: path.join(__dirname, 'tunneld'),
  };
}

// ---------------------------------------------------------------- settings

function isIpv4(value) {
  const parts = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(value));
  return Boolean(parts) && parts.slice(1).every((p) => Number(p) <= 255);
}

function isPort(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 65535 && /^\d+$/.test(String(value));
}

function checkTarget(server, port) {
  if (!isIpv4(server)) {
    fail('INVALID_INPUT', `"${server}" is not an IPv4 address.`, {
      hint: 'Enter the proxy as four numbers, for example 192.168.49.1. Host names are not accepted.',
    });
  }
  if (!isPort(port)) {
    fail('INVALID_INPUT', `"${port}" is not a port number.`, { hint: 'Use a number from 1 to 65535.' });
  }
}

// The file is KEY=VALUE lines so the daemon, a shell script, can read it
// without a JSON parser. Anything unrecognised reads as the default.
function parseConfig(text) {
  const values = {};
  for (const line of String(text || '').split('\n')) {
    const at = line.indexOf('=');
    if (at > 0) values[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return {
    enabled: values.ENABLED === '1',
    server: isIpv4(values.SERVER) ? values.SERVER : DEFAULTS.server,
    port: isPort(values.PORT) ? Number(values.PORT) : DEFAULTS.port,
  };
}

function formatConfig({ enabled, server, port }) {
  return `ENABLED=${enabled ? 1 : 0}\nSERVER=${server}\nPORT=${port}\n`;
}

function readConfig(paths = layout()) {
  try {
    return parseConfig(fs.readFileSync(paths.config, 'utf8'));
  } catch {
    return { enabled: false, ...DEFAULTS };
  }
}

// The folder is root's, so the file is rewritten in place rather than
// replaced: only the file itself is the person's to write.
function writeConfig(changes, paths = layout()) {
  if (!fs.existsSync(paths.config)) {
    fail('TUNNEL_NOT_INSTALLED', 'The proxy tunnel is not installed.', {
      hint: 'Install it once from the Turink Toys window, or run "sudo turink-toys tunnel.install".',
    });
  }
  const next = { ...readConfig(paths), ...changes };
  checkTarget(next.server, next.port);
  fs.writeFileSync(paths.config, formatConfig(next));
  return next;
}

// ---------------------------------------------------------------- status

function readStatus(paths = layout(), now = Date.now()) {
  const installed = fs.existsSync(paths.plist) && fs.existsSync(paths.daemon) && fs.existsSync(paths.tun2socks);
  const config = readConfig(paths);
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(paths.status, 'utf8'));
  } catch {
    // No report yet: the daemon has not run, or is not installed.
  }
  let state = 'not-installed';
  let since = null;
  if (installed) {
    const fresh = report && now - Number(report.updated) * 1000 < STALE_MS;
    state = fresh ? report.state : 'stopped';
    since = fresh && report.since ? new Date(Number(report.since) * 1000).toISOString() : null;
  }
  return {
    installed,
    enabled: config.enabled,
    server: config.server,
    port: config.port,
    isDefault: config.server === DEFAULTS.server && config.port === DEFAULTS.port,
    // off, waiting, on, problem, stopped (daemon silent) or not-installed.
    state,
    since,
  };
}

// ---------------------------------------------------------------- install

function plistXml(paths = layout()) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${esc(paths.daemon)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`;
}

function download(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const request = https
      .get(url, { headers: { 'User-Agent': 'turink-toys' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          res.resume();
          resolve(download(res.headers.location, redirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
    // A connection that stalls would otherwise keep the elevated install, and
    // the window waiting on it, open forever.
    request.setTimeout(DOWNLOAD_TIMEOUT_MS, () => request.destroy(new Error('timed out')));
  });
}

async function installedVersion(paths) {
  try {
    const { stdout } = await exec(paths.tun2socks, ['-v']);
    return stdout.trim();
  } catch {
    return null;
  }
}

// tun2socks is fetched from its official release rather than shipped in the
// app, and refused unless it matches the published checksum. It is staged
// next to the installed copy and only moved into place once the service has
// stopped, because the download may itself need the running tunnel.
async function stageTun2socks(paths) {
  if ((await installedVersion(paths)) === `tun2socks-${TUN2SOCKS.version.slice(1)}`) return null;
  let zip;
  try {
    zip = await download(TUN2SOCKS.url);
  } catch (err) {
    fail('FAILED', `tun2socks could not be downloaded: ${err.message}`, {
      hint: 'Check the internet connection and install again.',
    });
  }
  const digest = crypto.createHash('sha256').update(zip).digest('hex');
  if (digest !== TUN2SOCKS.sha256) {
    fail('FAILED', 'The downloaded tun2socks does not match the official release, so it was not installed.', {
      hint: 'Try again later. If it keeps happening, the download is being altered on the way.',
    });
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'turink-tunnel-'));
  try {
    fs.writeFileSync(path.join(temp, 't.zip'), zip);
    await exec('/usr/bin/ditto', ['-x', '-k', path.join(temp, 't.zip'), path.join(temp, 'x')]);
    const binary = fs.readdirSync(path.join(temp, 'x')).find((name) => name.startsWith('tun2socks'));
    if (!binary) fail('FAILED', 'The tun2socks archive did not contain the program.');
    const staged = `${paths.tun2socks}.new`;
    fs.copyFileSync(path.join(temp, 'x', binary), staged);
    return staged;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

// Files the root daemon runs are written under a new name and renamed into
// place: a running zsh reads its script by offset, so rewriting the same file
// under it would make it run a mix of old and new lines. They are also handed
// to root, since copyFile can carry the person's ownership across.
function placeRootFile(from, to, mode) {
  const staged = from.endsWith('.new') ? from : `${to}.new`;
  if (staged !== from) fs.copyFileSync(from, staged);
  fs.chownSync(staged, 0, 0);
  fs.chmodSync(staged, mode);
  fs.renameSync(staged, to);
}

// Runs as root. The owner is the person the settings file belongs to.
async function install(owner, paths = layout()) {
  fs.mkdirSync(paths.dir, { recursive: true, mode: 0o755 });
  fs.chownSync(paths.dir, 0, 0);
  fs.chmodSync(paths.dir, 0o755);
  const staged = await stageTun2socks(paths);

  await stopService();
  if (staged) placeRootFile(staged, paths.tun2socks, 0o755);
  placeRootFile(paths.bundledDaemon, paths.daemon, 0o755);
  if (!fs.existsSync(paths.config)) fs.writeFileSync(paths.config, formatConfig({ enabled: true, ...DEFAULTS }));
  else fs.writeFileSync(paths.config, formatConfig({ ...readConfig(paths), enabled: true }));
  fs.chownSync(paths.config, owner, 20); // group staff
  fs.chmodSync(paths.config, 0o644);

  fs.writeFileSync(paths.plist, plistXml(paths), { mode: 0o644 });
  // bootstrap can still refuse for a moment after the old job is gone, so it
  // is tried a few times before giving up.
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await exec('/bin/launchctl', ['bootstrap', 'system', paths.plist]);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      await sleep(1000);
    }
  }
  if (lastError) {
    fs.rmSync(paths.plist, { force: true });
    fail('FAILED', `The tunnel service could not be started: ${String(lastError.stderr || lastError.message).trim()}`);
  }
  return { fetched: Boolean(staged) };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function serviceLoaded() {
  try {
    await exec('/bin/launchctl', ['print', `system/${LABEL}`]);
    return true;
  } catch {
    return false;
  }
}

// bootout returns before a running daemon has finished its exit trap, which
// is where the tunnel puts the routes and DNS back. Registering the job again
// in that window fails with "Bootstrap failed: 5", so this waits until launchd
// no longer knows the job.
async function stopService() {
  await exec('/bin/launchctl', ['bootout', `system/${LABEL}`]).catch(() => {});
  for (let i = 0; i < 50 && (await serviceLoaded()); i++) await sleep(200);
}

// Runs as root. Stopping the daemon makes it put the routes and DNS back
// before it exits, so the files are removed only after that.
async function uninstall(paths = layout()) {
  await stopService();
  fs.rmSync(paths.plist, { force: true });
  fs.rmSync(paths.dir, { recursive: true, force: true });
}

module.exports = {
  LABEL,
  DIR,
  DEFAULTS,
  TUN2SOCKS,
  layout,
  isIpv4,
  isPort,
  checkTarget,
  parseConfig,
  formatConfig,
  readConfig,
  writeConfig,
  readStatus,
  plistXml,
  install,
  uninstall,
};
