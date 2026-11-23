'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const service = require('../src/tasks/tunnel/service');

// Only the parts that need no root are tested. Installing would register a
// system daemon and change the Mac's routes, which a test run must never do.

function tempLayout(withFiles) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tunnel-test-'));
  const paths = { ...service.layout(dir), plist: path.join(dir, 'daemon.plist') };
  if (withFiles) for (const file of [paths.plist, paths.daemon, paths.tun2socks]) fs.writeFileSync(file, '');
  return paths;
}

test('only IPv4 addresses and ports in range are accepted', () => {
  assert.ok(service.isIpv4('192.168.49.1'));
  assert.ok(service.isIpv4('127.0.0.1'));
  for (const bad of ['256.1.1.1', '1.2.3', 'example.com', '1.2.3.4; rm -rf /', '', '::1']) assert.ok(!service.isIpv4(bad), bad);
  assert.ok(service.isPort(1080));
  assert.ok(service.isPort('65535'));
  for (const bad of [0, 65536, '80a', '1.5', '']) assert.ok(!service.isPort(bad), String(bad));
  assert.throws(() => service.checkTarget('host.example', 1080), /IPv4/);
  assert.throws(() => service.checkTarget('10.0.0.1', 70000), /port/);
});

test('the settings file reads back what was written and ignores anything else', () => {
  const text = service.formatConfig({ enabled: true, server: '10.0.0.2', port: 1086 });
  assert.equal(text, 'ENABLED=1\nSERVER=10.0.0.2\nPORT=1086\n');
  assert.deepEqual(service.parseConfig(text), { enabled: true, server: '10.0.0.2', port: 1086 });
  // A hand-edited or damaged file falls back to the defaults instead of passing junk on.
  assert.deepEqual(service.parseConfig('ENABLED=yes\nSERVER=$(reboot)\nPORT=99999\n'), {
    enabled: false,
    ...service.DEFAULTS,
  });
});

test('changing settings needs the tunnel installed and keeps other values', () => {
  const paths = tempLayout(false);
  assert.throws(() => service.writeConfig({ enabled: true }, paths), /not installed/);
  fs.writeFileSync(paths.config, service.formatConfig({ enabled: false, server: '10.0.0.2', port: 1086 }));
  assert.deepEqual(service.writeConfig({ enabled: true }, paths), { enabled: true, server: '10.0.0.2', port: 1086 });
  assert.throws(() => service.writeConfig({ server: 'evil;cmd' }, paths), /IPv4/);
  assert.equal(service.readConfig(paths).server, '10.0.0.2');
});

test('the state comes from a fresh report, and a silent service reads as stopped', () => {
  const now = Date.parse('2026-11-21T05:00:00Z');
  const paths = tempLayout(false);
  assert.equal(service.readStatus(paths, now).state, 'not-installed');

  const installed = tempLayout(true);
  fs.writeFileSync(installed.config, service.formatConfig({ enabled: true, ...service.DEFAULTS }));
  fs.writeFileSync(installed.status, JSON.stringify({ state: 'on', since: now / 1000 - 60, updated: now / 1000 - 5 }));
  const fresh = service.readStatus(installed, now);
  assert.equal(fresh.state, 'on');
  assert.equal(fresh.since, new Date(now - 60000).toISOString());
  assert.ok(fresh.isDefault);

  fs.writeFileSync(installed.status, JSON.stringify({ state: 'on', since: 0, updated: now / 1000 - 120 }));
  assert.equal(service.readStatus(installed, now).state, 'stopped');
});

test('the daemon runs the installed script with zsh, at load and kept alive', () => {
  const xml = service.plistXml(service.layout('/Library/Application Support/a&b'));
  assert.ok(xml.includes(`<string>${service.LABEL}</string>`));
  assert.ok(xml.includes('<string>/bin/zsh</string>'));
  assert.ok(xml.includes('/Library/Application Support/a&amp;b/tunneld'));
  assert.match(xml, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(xml, /<key>KeepAlive<\/key>\s*<true\/>/);
});

test('the bundled service script parses', () => {
  execFileSync('/bin/zsh', ['-n', service.layout().bundledDaemon]);
});

// Unbound, tun2socks's connections to the proxy fall into the tunnel whenever
// Wi-Fi loses its address for a moment, and loop there until no port is left.
test('tun2socks reaches the proxy over the interface the tunnel started on', () => {
  const script = fs.readFileSync(service.layout().bundledDaemon, 'utf8');
  const launch = script.split('\n').find((line) => line.includes('"$BIN" --device'));
  assert.ok(launch && launch.includes('--interface "$iface"'), launch);
});

test('a change waits for the service to report it, but not forever', async () => {
  const paths = tempLayout(true);
  fs.writeFileSync(paths.config, service.formatConfig({ enabled: true, ...service.DEFAULTS }));
  const report = (state) => JSON.stringify({ state, since: Date.now() / 1000, updated: Date.now() / 1000 });
  fs.writeFileSync(paths.status, report('off'));
  setTimeout(() => fs.writeFileSync(paths.status, report('waiting')), 60);
  const seen = await service.awaitStatus((s) => s.state !== 'off', { paths, stepMs: 20 });
  assert.equal(seen.state, 'waiting');

  const started = Date.now();
  const late = await service.awaitStatus((s) => s.state === 'on', { paths, timeoutMs: 100, stepMs: 20 });
  assert.equal(late.state, 'waiting');
  assert.ok(Date.now() - started < 1000);
});
