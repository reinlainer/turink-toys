'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { dirs } = require('../../kernel/paths');
const { fail } = require('../../kernel/errors');

const run = promisify(execFile);

// The wheel reverser is a native helper run as a per-user launch agent. Whether
// reversal is on is nothing more than whether the agent is registered, so there
// is no setting to drift out of step with what is actually running.
//
// The helper is a small background application copied out of the bundle and
// signed ad hoc. macOS remembers the Accessibility permission per signed
// application, so the copy is replaced only when the helper's own version
// changes; updating Turink Toys alone keeps the permission.

const HELPER = require('../../../native/helpers').helper('scroll-reverser');
const LABEL = HELPER.identifier;

function layout(home = dirs.home) {
  const support = path.join(home, 'Library', 'Application Support', 'turink-toys');
  // The copy stays out of Spotlight for the same reason as the bundled one; see
  // native/helpers.js.
  const installedApp = path.join(support, 'helpers.noindex', `${HELPER.name}.app`);
  return {
    bundledApp: HELPER.app,
    bundled: HELPER.binary,
    installedApp,
    installed: path.join(installedApp, 'Contents', 'MacOS', HELPER.executable),
    state: path.join(support, 'state', `${HELPER.executable}.json`),
    plist: path.join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`),
  };
}

function escapeXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// KeepAlive brings the helper back if it ever exits; without it a crash would
// silently return the wheel to its old direction.
function plistXml(paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(paths.installed)}</string>
    <string>--state</string>
    <string>${escapeXml(paths.state)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
`;
}

// launchctl print has no machine-readable form; the pid line is the one field
// relied on, and its absence means the agent is loaded but not running.
function parseLaunchctl(text) {
  const match = /^\s*pid = (\d+)\s*$/m.exec(text || '');
  return { loaded: Boolean(text), pid: match ? Number(match[1]) : null };
}

// off: not registered. stopped: registered but not running. starting: running
// but has not reported yet. needs-permission: waiting for Accessibility.
// active: reversing.
function describe({ enabled, agent, state }) {
  if (!enabled) return 'off';
  if (!agent || !agent.pid) return 'stopped';
  if (!state || state.pid !== agent.pid) return 'starting';
  if (!state.trusted) return 'needs-permission';
  return state.active ? 'active' : 'starting';
}

function domain() {
  return `gui/${process.getuid()}`;
}

async function agentInfo() {
  try {
    const { stdout } = await run('/bin/launchctl', ['print', `${domain()}/${LABEL}`]);
    return parseLaunchctl(stdout);
  } catch {
    return parseLaunchctl('');
  }
}

function readState(paths) {
  try {
    return JSON.parse(fs.readFileSync(paths.state, 'utf8'));
  } catch {
    return null;
  }
}

async function helperVersion(binary) {
  try {
    const { stdout } = await run(binary, ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function status(paths = layout()) {
  const enabled = fs.existsSync(paths.plist);
  const agent = enabled ? await agentInfo() : null;
  const state = enabled ? readState(paths) : null;
  return {
    reversing: enabled,
    helper: describe({ enabled, agent, state }),
    pid: agent && agent.pid,
  };
}

// The name and identifier live in Info.plist rather than in the executable, so
// a change to either replaces the copy even when VERSION stays the same.
function sameInfo(paths) {
  const info = (app) => {
    try {
      return fs.readFileSync(path.join(app, 'Contents', 'Info.plist'), 'utf8');
    } catch {
      return null;
    }
  };
  const bundled = info(paths.bundledApp);
  return bundled !== null && bundled === info(paths.installedApp);
}

async function install(paths) {
  const bundled = await helperVersion(paths.bundled);
  if (!bundled) {
    fail('HELPER_MISSING', 'The scroll helper is not part of this build.', {
      hint: 'In a source checkout, run "npm run helpers" and try again. A release build always includes it.',
    });
  }
  if ((await helperVersion(paths.installed)) === bundled && sameInfo(paths)) return { replaced: false, version: bundled };

  const existed = fs.existsSync(paths.installedApp);
  const temp = path.join(path.dirname(paths.installedApp), `.${path.basename(paths.installedApp)}.new`);
  fs.rmSync(temp, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(temp), { recursive: true });
  fs.cpSync(paths.bundledApp, temp, { recursive: true, verbatimSymlinks: true });
  // Signing the bundle on its own gives it the identifier from its Info.plist
  // whatever the enclosing application's signing did to it, and the ad hoc
  // signature is the same for the same binary every time.
  await run('/usr/bin/codesign', ['--force', '--sign', '-', temp]);
  fs.rmSync(paths.installedApp, { recursive: true, force: true });
  fs.renameSync(temp, paths.installedApp);
  return { replaced: existed, version: bundled };
}

async function bootout() {
  try {
    await run('/bin/launchctl', ['bootout', `${domain()}/${LABEL}`]);
  } catch {
    // Not loaded is the usual reason, and the goal is the same either way.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enable(paths = layout()) {
  const installed = await install(paths);
  const xml = plistXml(paths);
  const current = fs.existsSync(paths.plist) ? fs.readFileSync(paths.plist, 'utf8') : null;
  const agent = await agentInfo();

  // An agent already running the same helper with the same definition is left
  // alone, so turning reversal on twice does not restart it. A replaced helper
  // always restarts, since the running process is still the old copy.
  if (installed.replaced || current !== xml || !agent.pid) {
    fs.mkdirSync(path.dirname(paths.plist), { recursive: true });
    fs.mkdirSync(path.dirname(paths.state), { recursive: true });
    fs.writeFileSync(paths.plist, xml);
    fs.rmSync(paths.state, { force: true });
    await bootout();
    await run('/bin/launchctl', ['bootstrap', domain(), paths.plist]);
  }

  // The helper reports within moments of starting; waiting briefly lets the
  // result say whether permission is still needed.
  let result = await status(paths);
  for (let i = 0; i < 15 && result.helper === 'starting'; i++) {
    await sleep(200);
    result = await status(paths);
  }
  return { ...result, replaced: installed.replaced };
}

async function disable(paths = layout()) {
  const wasOn = fs.existsSync(paths.plist);
  await bootout();
  fs.rmSync(paths.plist, { force: true });
  fs.rmSync(paths.state, { force: true });
  // The installed helper stays, so turning reversal back on later finds the
  // permission already granted.
  return { reversing: false, helper: 'off', pid: null, stopped: wasOn };
}

module.exports = { LABEL, HELPER, layout, plistXml, parseLaunchctl, describe, status, enable, disable };
