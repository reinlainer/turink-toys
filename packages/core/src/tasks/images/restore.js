'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const journal = require('../../kernel/journal');
const { restoreItems } = require('../../kernel/trash');
const { row } = require('../../kernel/present');

register(
  defineTask({
    id: 'images.restore',
    title: 'Restore photos',
    summary: 'Return photos that a previous images.trash moved to the Trash',
    whenToUse:
      'Undoing an images.trash run whose photos are still in the Trash. Needs the run identifier that the removal reported. A photo whose original name has been taken since is reported rather than overwritten.',
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
          description: 'Which removal to undo.',
          optionsFrom: { runs: 'images.trash' },
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        restored: { type: 'array', description: 'Paths returned to their original location.' },
        failed: { type: 'array', description: 'Photos that could not be returned, as { path, reason }.' },
      },
    },
    examples: [
      {
        description: 'Undo the removal recorded under a run identifier',
        command: 'turink-toys images.restore 0mtcgh29y6f9826232b --json',
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
      const start = events && events.find((e) => e.event === 'run.start');
      if (!start || start.task !== 'images.trash') {
        fail('SRC_NOT_FOUND', `There is no photo removal recorded under "${input.run}".`, {
          hint: 'Run "turink-toys runs list --json" to find the identifier of an images.trash run.',
        });
      }

      const end = events.find((e) => e.event === 'run.end');
      const trashed = end?.result?.trashed ?? [];
      if (trashed.length === 0) {
        fail('SRC_NOT_FOUND', `Run "${input.run}" moved nothing to the Trash.`, {
          hint: 'Only a removal that was confirmed and completed can be restored.',
        });
      }

      const { restored, failed } = await restoreItems(run, trashed);
      return { sourceRun: input.run, restored, failed, partial: failed.length > 0 };
    },
  })
);
