'use strict';

const fs = require('fs');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
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

// pmset -g reports the values for the power source in use, and a laptop keeps
// separate ones for the power adapter and the battery. The source is read
// alongside so a caller can say which set the numbers belong to.
async function readPowerSource() {
  try {
    const { stdout } = await exec(PMSET, ['-g', 'batt']);
    if (stdout.includes("'AC Power'")) return 'ac';
    if (stdout.includes("'Battery Power'")) return 'battery';
  } catch {
    // A missing source only drops the label; the settings still stand.
  }
  return null;
}

async function readSettings() {
  const [{ stdout }, powerSource] = await Promise.all([exec(PMSET, ['-g']), readPowerSource()]);
  const sleepDisabled = /SleepDisabled\s+(\d)/.exec(stdout);
  const displaySleep = /displaysleep\s+(\d+)/.exec(stdout);
  const sleep = /\bsleep\s+(\d+)/.exec(stdout);
  return {
    lidSleepDisabled: sleepDisabled ? sleepDisabled[1] === '1' : false,
    displaySleepMinutes: displaySleep ? Number(displaySleep[1]) : null,
    systemSleepMinutes: sleep ? Number(sleep[1]) : null,
    powerSource,
    raw: stdout,
  };
}

async function setLidSleepDisabled(value) {
  await exec(PMSET, ['-a', 'disablesleep', value ? '1' : '0']);
  const after = await readSettings();
  return after.lidSleepDisabled === value;
}

// The restore time is truncated to the minute so the calendar trigger, which
// fires at the start of that minute, is never earlier than the time it checks.
function restoreEpoch(restoreAt) {
  return Math.floor(new Date(restoreAt).getTime() / 60000) * 60;
}

// StartCalendarInterval has no year, and launchd keeps a calendar job loaded
// after it runs. So the script checks the restore time itself and unloads its
// own job, and RunAtLoad lets a reboot past the restore time catch up at once
// instead of waiting for the same date a year later.
function restoreDaemonPlist(restoreAt) {
  const at = new Date(restoreEpoch(restoreAt) * 1000);
  const script = [
    `[ "$(/bin/date +%s)" -ge ${restoreEpoch(restoreAt)} ] || exit 0`,
    `${PMSET} -a disablesleep 0`,
    `/bin/rm -f ${DAEMON_PLIST}`,
    `/bin/launchctl bootout system/${DAEMON_LABEL}`,
  ].join('; ');
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
    <string>${script.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Month</key><integer>${at.getMonth() + 1}</integer>
    <key>Day</key><integer>${at.getDate()}</integer>
    <key>Hour</key><integer>${at.getHours()}</integer>
    <key>Minute</key><integer>${at.getMinutes()}</integer>
  </dict>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
`;
}

// A LaunchAgent runs as the user and cannot undo a root-owned pmset setting, so
// the scheduled restore has to be a daemon. It is installed during the same
// authenticated moment that disables sleep, runs once at the restore time and
// removes itself. Nothing stays resident, and the restore survives both
// quitting the app and a reboot.
async function scheduleRestore(restoreAt) {
  // bootstrap refuses a label that is still loaded and keeps the old schedule,
  // so any earlier job is unloaded first. A failure to load is then real and
  // must reach the caller: the restore is the safety net for this setting.
  await exec('/bin/launchctl', ['bootout', `system/${DAEMON_LABEL}`]).catch(() => {});
  fs.writeFileSync(DAEMON_PLIST, restoreDaemonPlist(restoreAt), { mode: 0o644 });
  try {
    await exec('/bin/launchctl', ['bootstrap', 'system', DAEMON_PLIST]);
  } catch (err) {
    fs.rmSync(DAEMON_PLIST, { force: true });
    throw err;
  }
}

async function cancelRestore() {
  await exec('/bin/launchctl', ['bootout', `system/${DAEMON_LABEL}`]).catch(() => {});
  if (fs.existsSync(DAEMON_PLIST)) fs.rmSync(DAEMON_PLIST, { force: true });
}

// The scheduled time, read back from the installed job, or null when no
// restore is pending.
function scheduledRestore() {
  try {
    const match = /-ge (\d+)/.exec(fs.readFileSync(DAEMON_PLIST, 'utf8'));
    return match ? new Date(Number(match[1]) * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

function restoreScheduled() {
  return fs.existsSync(DAEMON_PLIST);
}

// The state file records a process id, and a reboot can hand that id to an
// unrelated process. A suppression counts as active only before its expiry and
// while that id still belongs to caffeinate.
function isCaffeinate(pid) {
  try {
    const name = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'comm='], { encoding: 'utf8' });
    return path.basename(name.trim()) === 'caffeinate';
  } catch {
    return false;
  }
}

function readKeepAwake() {
  try {
    const state = JSON.parse(fs.readFileSync(KEEP_AWAKE_STATE, 'utf8'));
    if (new Date(state.expiresAt).getTime() > Date.now() && isCaffeinate(state.pid)) return state;
    fs.rmSync(KEEP_AWAKE_STATE, { force: true });
    return null;
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
  scheduledRestore,
  readKeepAwake,
  writeKeepAwake,
  clearKeepAwake,
  PMSET,
  DAEMON_LABEL,
  DAEMON_PLIST,
};
