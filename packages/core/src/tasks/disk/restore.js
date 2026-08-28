'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const journal = require('../../kernel/journal');
const { row } = require('../../kernel/present');

const exec = promisify(execFile);

// The Trash is covered by macOS privacy protection, so an ordinary process can
// put items in but cannot list or read what is there. Restoring therefore goes
// through Finder, which holds the necessary access. macOS asks the user once to
// allow this tool to control Finder, and refusing leaves restore unavailable
// without affecting anything else.

function appleScript(trashName, destination) {
  const name = trashName.replace(/"/g, '\\"');
  const target = destination.replace(/"/g, '\\"');
  return [
    'tell application "Finder"',
    `  set theItem to (first item of the trash whose name is "${name}")`,
    `  move theItem to POSIX file "${target}"`,
    'end tell',
  ].join('\n');
}

async function restoreOne(trashName, destinationDir) {
  try {
    await exec('/usr/bin/osascript', ['-e', appleScript(trashName, destinationDir)]);
    return { ok: true };
  } catch (err) {
    const message = String(err.stderr || err.message);
    if (message.includes('-1743') || message.toLowerCase().includes('not authorized')) {
      fail('NEEDS_PRIVILEGE', 'Restoring requires permission to control Finder.', {
        hint: 'Approve the Finder automation prompt, or enable it under Privacy & Security > Automation.',
        retryable: true,
      });
    }
    return { ok: false, reason: message.trim() };
  }
}

register(
  defineTask({
    id: 'disk.restore',
    title: 'Restore from Trash',
    summary: 'Return items a previous cleanup moved to the Trash',
    whenToUse:
      'Undoing a disk.clean run whose result is still in the Trash. Needs the run identifier that the cleanup reported.',
    risk: 'create',
    cost: 'proportional',
    idempotent: false,
    errors: ['SRC_NOT_FOUND', 'NEEDS_PRIVILEGE', 'PARTIAL'],
    input: {
      type: 'object',
      required: ['run'],
      properties: {
        run: {
          label: 'Run identifier',
          type: 'string',
          positional: true,
          description: 'Which cleanup to undo.',
          // Recent runs rather than a task, since what can be restored is a
          // matter of history rather than of configuration.
          optionsFrom: { runs: 'disk.clean' },
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        restored: { type: 'array', description: 'Paths returned to their original location.' },
      },
    },
    examples: [
      {
        description: 'Undo the cleanup recorded under a run identifier',
        command: 'turink-toys disk.restore 0mtcgh29y6f9826232b --json',
      },
    ],
    present(result, t) {
      return {
        rows: [
          row(t('result.restored', 'Restored'), String(((result && result.restored) || []).length), 'good'),
          ((result && result.failed) || []).length > 0
            ? row(t('result.failed', 'Failed'), String(result.failed.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: ((result && result.restored) || []).slice(0, 6),
      };
    },

    async execute(run, input) {
      const events = journal.read(input.run);
      if (!events) {
        fail('SRC_NOT_FOUND', `There is no run recorded under "${input.run}".`, {
          hint: 'Run "turink-toys runs list --json" to find the identifier.',
        });
      }

      const end = events.find((e) => e.event === 'run.end');
      const trashed = end?.result?.trashed ?? [];

      if (trashed.length === 0) {
        fail('SRC_NOT_FOUND', `Run "${input.run}" moved nothing to the Trash.`, {
          hint: 'Only a disk.clean run without --permanent can be restored.',
        });
      }
      if (end.result.permanent) {
        fail('SRC_NOT_FOUND', `Run "${input.run}" deleted permanently and cannot be undone.`, {
          hint: 'Permanent deletions leave nothing in the Trash to return.',
        });
      }

      const restored = [];
      const failed = [];

      for (const [index, item] of trashed.entries()) {
        run.progress(index + 1, trashed.length, item.from, 'path');
        const destination = item.from.replace(/\/[^/]+$/, '');
        const outcome = await restoreOne(item.trashName, destination);
        if (outcome.ok) {
          restored.push(item.from);
        } else {
          failed.push({ path: item.from, reason: outcome.reason });
          run.warn('RESTORE_FAILED', { path: item.from, reason: outcome.reason });
        }
      }

      return {
        sourceRun: input.run,
        restored,
        failed,
        partial: failed.length > 0,
      };
    },
  })
);
