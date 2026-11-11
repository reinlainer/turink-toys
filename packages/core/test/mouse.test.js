'use strict';

const test = require('node:test');
const assert = require('node:assert');

const reverser = require('../src/tasks/mouse/reverser');

// Only the pure parts are tested here. Enabling or disabling would register or
// remove the person's real launch agent, which a test run must never touch.

test('the helper and its files live under the given home directory', () => {
  const paths = reverser.layout('/Users/someone');
  assert.equal(paths.installedApp, '/Users/someone/Library/Application Support/turink-toys/helpers.noindex/Turink-Toys Scroll Reverser.app');
  assert.equal(paths.installed, `${paths.installedApp}/Contents/MacOS/scroll-reverser`);
  assert.equal(paths.state, '/Users/someone/Library/Application Support/turink-toys/state/scroll-reverser.json');
  assert.equal(paths.plist, `/Users/someone/Library/LaunchAgents/${reverser.LABEL}.plist`);
  assert.ok(paths.bundled.endsWith('/packages/core/native/build.noindex/Turink-Toys Scroll Reverser.app/Contents/MacOS/scroll-reverser'));
});

test('the agent runs the installed helper, reports its state and stays alive', () => {
  const xml = reverser.plistXml(reverser.layout('/Users/a&b'));
  assert.ok(xml.includes(`<string>${reverser.LABEL}</string>`));
  // A raw ampersand would make the property list unreadable to launchd.
  assert.ok(xml.includes('/Users/a&amp;b/Library/Application Support/turink-toys/helpers.noindex/Turink-Toys Scroll Reverser.app/Contents/MacOS/scroll-reverser'));
  assert.ok(!/a&b/.test(xml));
  assert.match(xml, /<string>--state<\/string>\s*<string>[^<]*scroll-reverser\.json<\/string>/);
  assert.match(xml, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(xml, /<key>KeepAlive<\/key>\s*<true\/>/);
});

test('launchctl output yields the running pid, or none', () => {
  const running = 'gui/501/x = {\n\tstate = running\n\tpid = 4242\n\tendpoints = {\n\t}\n}';
  assert.deepEqual(reverser.parseLaunchctl(running), { loaded: true, pid: 4242 });
  assert.deepEqual(reverser.parseLaunchctl('gui/501/x = {\n\tstate = not running\n}'), { loaded: true, pid: null });
  assert.deepEqual(reverser.parseLaunchctl(''), { loaded: false, pid: null });
});

test('the helper state reads off, stopped, starting, needs-permission or active', () => {
  const agent = { pid: 10 };
  const cases = [
    [{ enabled: false, agent, state: { pid: 10, trusted: true, active: true } }, 'off'],
    [{ enabled: true, agent: { pid: null }, state: null }, 'stopped'],
    [{ enabled: true, agent, state: null }, 'starting'],
    // A report left by a previous process says nothing about the current one.
    [{ enabled: true, agent, state: { pid: 9, trusted: true, active: true } }, 'starting'],
    [{ enabled: true, agent, state: { pid: 10, trusted: false, active: false } }, 'needs-permission'],
    [{ enabled: true, agent, state: { pid: 10, trusted: true, active: false } }, 'starting'],
    [{ enabled: true, agent, state: { pid: 10, trusted: true, active: true } }, 'active'],
  ];
  for (const [input, expected] of cases) assert.equal(reverser.describe(input), expected, JSON.stringify(input));
});

test('the permission note appears only while permission is missing', () => {
  const { presentWheel } = require('../src/tasks/mouse/present');
  const t = (key, fallback) => fallback;
  assert.equal(presentWheel({ reversing: true, helper: 'needs-permission' }, t).notes.length, 1);
  assert.equal(presentWheel({ reversing: true, helper: 'active' }, t).notes.length, 0);
  assert.equal(presentWheel({ reversing: false, helper: 'off' }, t).rows[0].value, 'Follows System Settings');
});
