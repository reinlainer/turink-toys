'use strict';

const fs = require('fs');
const { spawn } = require('child_process');

// Runs the clipboard helper in watch mode while collection is on. The helper
// saves each new image itself; the window learns of it from the folder, so a
// save made from the command line shows up the same way.
//
// A helper that stops while it is still wanted is started again, waiting a
// little longer after each failure so a helper that cannot run does not spin.

function create({ binary, folder, onError }) {
  let child = null;
  let wanted = false;
  let failures = 0;
  let timer = null;

  function start() {
    clearTimeout(timer);
    if (child || !wanted || !fs.existsSync(binary)) return;
    const proc = spawn(binary, ['watch', '--dir', folder], { stdio: ['ignore', 'pipe', 'ignore'] });
    child = proc;

    let buffer = '';
    proc.stdout.on('data', (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        let message = null;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.event === 'ready') failures = 0;
        else if (message.event === 'error' && onError) onError(message);
      }
    });
    proc.on('error', () => {});
    proc.on('exit', () => {
      // A helper replaced by a newer one must not clear its successor.
      if (child !== proc) return;
      child = null;
      if (!wanted) return;
      failures += 1;
      timer = setTimeout(start, Math.min(60 * 1000, 1000 * 2 ** failures));
    });
  }

  function stop() {
    clearTimeout(timer);
    const proc = child;
    child = null;
    if (proc) proc.kill();
  }

  function set(on) {
    wanted = Boolean(on);
    if (wanted) start();
    else stop();
  }

  return { set, stop, running: () => Boolean(child) };
}

module.exports = { create };
