'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { dirs } = require('../../kernel/paths');

const exec = promisify(execFile);

const PMSET = '/usr/bin/pmset';
const DAEMON_LABEL = 'com.turink.toys.lid-restore';
const DAEMON_PLIST = `/Library/LaunchDaemons/${DAEMON_LABEL}.plist`;
const KEEP_AWAKE_STATE = path.join(dirs.state, 'keep-awake.json');

// "disablesleep" does not appear in the pmset manual page. Its argument string
// is present in the pmset binary and pmset -g reports the matching
// SleepDisabled value, so it works, but Apple documents no contract for it and
// a future release could change the behaviour. Every write is therefore read
// back and verified rather than assumed to have taken effect.

async function readSettings() {
  const { stdout } = await exec(PMSET, ['-g']);
  const sleepDisabled = /SleepDisabled\s+(\d)/.exec(stdout);
  const displaySleep = /displaysleep\s+(\d+)/.exec(stdout);
  const sleep = /\bsleep\s+(\d+)/.exec(stdout);
  return {
    lidSleepDisabled: sleepDisabled ? sleepDisabled[1] === '1' : false,
    displaySleepMinutes: displaySleep ? Number(displaySleep[1]) : null,
    systemSleepMinutes: sleep ? Number(sleep[1]) : null,
    raw: stdout,
  };
}

async function setLidSleepDisabled(value) {
  await exec(PMSET, ['-a', 'disablesleep', value ? '1' : '0']);
  const after = await readSettings();
  return after.lidSleepDisabled === value;
}

function restoreDaemonPlist(restoreAt) {
  const at = new Date(restoreAt);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${DAEMON_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>${PMSET} -a disablesleep 0; /bin/rm -f ${DAEMON_PLIST}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Month</key><integer>${at.getMonth() + 1}</integer>
    <key>Day</key><integer>${at.getDate()}</integer>
    <key>Hour</key><integer>${at.getHours()}</integer>
    <key>Minute</key><integer>${at.getMinutes()}</integer>
  </dict>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
`;
}

// A LaunchAgent runs as the user and cannot undo a root-owned pmset setting, so
// the scheduled restore has to be a daemon. It is installed during the same
// authenticated moment that disables sleep, runs once at the restore time and
// removes its own plist. Nothing stays resident, and the restore survives both
// quitting the app and a reboot.
async function scheduleRestore(restoreAt) {
  fs.writeFileSync(DAEMON_PLIST, restoreDaemonPlist(restoreAt), { mode: 0o644 });
  await exec('/bin/launchctl', ['bootstrap', 'system', DAEMON_PLIST]).catch(() => {
    // An already-loaded label is replaced rather than treated as a failure.
  });
}

async function cancelRestore() {
  await exec('/bin/launchctl', ['bootout', `system/${DAEMON_LABEL}`]).catch(() => {});
  if (fs.existsSync(DAEMON_PLIST)) fs.rmSync(DAEMON_PLIST, { force: true });
}

function restoreScheduled() {
  return fs.existsSync(DAEMON_PLIST);
}

function readKeepAwake() {
  try {
    const state = JSON.parse(fs.readFileSync(KEEP_AWAKE_STATE, 'utf8'));
    try {
      process.kill(state.pid, 0);
      return state;
    } catch {
      fs.rmSync(KEEP_AWAKE_STATE, { force: true });
      return null;
    }
  } catch {
    return null;
  }
}

function writeKeepAwake(state) {
  fs.mkdirSync(dirs.state, { recursive: true });
  fs.writeFileSync(KEEP_AWAKE_STATE, JSON.stringify(state));
}

function clearKeepAwake() {
  fs.rmSync(KEEP_AWAKE_STATE, { force: true });
}

module.exports = {
  readSettings,
  setLidSleepDisabled,
  scheduleRestore,
  cancelRestore,
  restoreScheduled,
  readKeepAwake,
  writeKeepAwake,
  clearKeepAwake,
  PMSET,
  DAEMON_LABEL,
  DAEMON_PLIST,
};
