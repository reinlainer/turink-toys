'use strict';

const https = require('https');
const core = require('@turink/core');

// Checks whether a newer release exists and reports it. Nothing is downloaded
// or replaced here.
//
// Applying an update in place needs a stable code signature, which an unsigned
// build does not have, so Homebrew does the upgrading and this only has to make
// sure a new version is not missed. That also keeps the application from
// carrying an updater it cannot use.

const { settings } = core;

const RELEASES = 'https://api.github.com/repos/reinlainer/turink-toys/releases/latest';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function fetchLatest() {
  return new Promise((resolve) => {
    const request = https.get(
      RELEASES,
      {
        headers: {
          'User-Agent': 'turink-toys',
          Accept: 'application/vnd.github+json',
        },
        timeout: 8000,
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          resolve(null);
          return;
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({
              version: String(data.tag_name || '').replace(/^v/, ''),
              url: data.html_url || null,
            });
          } catch {
            resolve(null);
          }
        });
      }
    );
    // A check that cannot reach the network is not a failure worth surfacing.
    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

// Compares dotted numeric versions without pulling in a dependency. A release
// tag this cannot parse is treated as not newer rather than as an update.
function isNewer(candidate, current) {
  const parse = (value) => String(value).split('.').map((part) => Number.parseInt(part, 10));
  const a = parse(candidate);
  const b = parse(current);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left !== right) return left > right;
  }
  return false;
}

async function check(currentVersion, { force = false } = {}) {
  const last = settings.get('updateCheckedAt', 0);
  if (!force && Date.now() - last < CHECK_INTERVAL_MS) {
    const known = settings.get('updateAvailable', null);
    return known && isNewer(known.version, currentVersion) ? known : null;
  }

  const latest = await fetchLatest();
  settings.set('updateCheckedAt', Date.now());
  if (!latest || !latest.version) return null;

  if (!isNewer(latest.version, currentVersion)) {
    settings.set('updateAvailable', null);
    return null;
  }

  settings.set('updateAvailable', latest);
  return latest;
}

module.exports = { check, isNewer, CHECK_INTERVAL_MS };
