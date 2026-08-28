'use strict';

const { spawn } = require('child_process');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const pmset = require('./pmset');
const { row } = require('../../kernel/present');

// caffeinate holds a power assertion for as long as its process lives, but the
// CLI exits as soon as the task returns. Spawning it detached is what makes the
// suppression outlast the command that requested it.

register(
  defineTask({
    id: 'power.keep-awake',
    title: 'Keep awake',
    summary: 'Suppress idle sleep for a set number of minutes',
    whenToUse:
      'Keeping the machine awake through a long build or download while the lid stays open. This does not affect what happens when the lid closes; use power.lid for that.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: false,
    errors: [],
    input: {
      type: 'object',
      properties: {
        minutes: {
          label: 'Duration',
          type: 'integer',
          minimum: 1,
          maximum: 1440,
          default: 60,
          description: 'How long to suppress idle sleep.',
        },
        off: {
          label: 'Turn off now',
          type: 'boolean',
          default: false,
          description: 'End an active suppression now.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Whether suppression is in effect.' },
        expiresAt: { type: 'string', description: 'When suppression ends.' },
      },
    },
    examples: [
      { description: 'Stay awake for two hours', command: 'turink-toys power.keep-awake --minutes 120' },
      { description: 'Stop early', command: 'turink-toys power.keep-awake --off' },
    ],
    present(result, t) {
      if (!result || !result.active) {
        return { rows: [row(t('result.idleSleep', 'Idle sleep'), t('result.normal', 'Normal'))] };
      }
      return {
        rows: [
          row(t('result.idleSleep', 'Idle sleep'), t('result.suppressed', 'Suppressed'), 'warn'),
          row(t('result.until', 'Until'), new Date(result.expiresAt).toLocaleString()),
        ],
        notes: [result && result.note],
      };
    },

    async execute(run, input) {
      const existing = pmset.readKeepAwake();

      if (input.off) {
        if (existing) {
          try {
            process.kill(existing.pid);
          } catch {
            // The process may have expired on its own between the read and now.
          }
          pmset.clearKeepAwake();
        }
        return { active: false, stopped: Boolean(existing) };
      }

      if (existing) {
        try {
          process.kill(existing.pid);
        } catch {
          // Replacing an expired assertion needs no handling.
        }
        pmset.clearKeepAwake();
      }

      const seconds = input.minutes * 60;
      const child = spawn('/usr/bin/caffeinate', ['-i', '-t', String(seconds)], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
      pmset.writeKeepAwake({ pid: child.pid, expiresAt, minutes: input.minutes });
      run.info(`Idle sleep suppressed until ${expiresAt}`);

      return {
        active: true,
        pid: child.pid,
        minutes: input.minutes,
        expiresAt,
        note: 'Closing the lid still sleeps the machine. Use power.lid to change that.',
      };
    },
  })
);
