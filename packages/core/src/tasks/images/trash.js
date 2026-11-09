'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { moveToTrash } = require('../../kernel/trash');
const { formatBytes } = require('../../kernel/format');
const { row } = require('../../kernel/present');
const { requireImages } = require('./files');

register(
  defineTask({
    id: 'images.trash',
    title: 'Move photos to the Trash',
    summary: 'Move photos, videos or PDFs to the Trash',
    whenToUse:
      'Getting rid of photos, videos or PDFs. The plan lists every file and its size before anything moves, and images.restore puts them back from the Trash. Only photos, videos and PDFs are accepted, so a wrong path cannot trash anything else.',
    risk: 'destroy',
    cost: 'proportional',
    idempotent: false,
    errors: ['SRC_NOT_FOUND', 'NOT_AN_IMAGE', 'NEEDS_CONFIRM', 'PLAN_MISMATCH', 'NEEDS_PRIVILEGE', 'LOCKED', 'PARTIAL'],
    input: {
      type: 'object',
      required: ['paths'],
      properties: {
        paths: {
          label: 'Photos',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'The photos to move to the Trash, by path.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        freedBytes: { type: 'integer', description: 'Space moved to the Trash.' },
        trashed: { type: 'array', description: 'Photos moved, as { from, trashName, bytes }: the original path and the name each has in the Trash.' },
        failed: { type: 'array', description: 'Photos that could not be moved, as { path, reason }.' },
      },
    },
    examples: [
      { description: 'Ask what trashing a photo would move', command: 'turink-toys images.trash ~/Pictures/a.jpg --json' },
      { description: 'Confirm the plan returned by the previous call', command: 'turink-toys images.trash ~/Pictures/a.jpg --confirm sha256:… --json' },
    ],

    // The plan is what the caller confirms. A photo removed or replaced in the
    // meantime changes the hash, so a confirmation never covers a different file.
    async plan(run, input) {
      const items = requireImages(input.paths).map((image) => ({ path: image.path, bytes: image.bytes }));
      const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
      return { items, bytes, summary: `${items.length} photo(s), ${formatBytes(bytes)}` };
    },

    present(result, t) {
      return {
        rows: [
          row(t('result.trashed', 'Moved to the Trash'), String(((result && result.trashed) || []).length), 'good'),
          row(t('result.reclaimed', 'Reclaimed'), result && result.freedReadable),
          ((result && result.failed) || []).length > 0
            ? row(t('result.failed', 'Failed'), String(result.failed.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: [
          result && result.restorable ? t('result.restorable', 'Moved to the Trash and can be restored.') : null,
          ...((result && result.failed) || []).map((item) => `${t('result.notMoved', 'Not moved')}: ${item.path}`),
        ],
      };
    },

    async execute(run, input, plan) {
      const trashed = [];
      const failed = [];
      let freed = 0;

      for (const [index, item] of plan.items.entries()) {
        run.progress(index + 1, plan.items.length, item.path, 'path');
        const outcome = await moveToTrash(item.path);
        if (outcome.ok) {
          // Recorded in the shape restoreItems reads, with the name the Trash
          // gave the file, which differs from its own when two photos share one.
          trashed.push({ from: item.path, trashName: outcome.trashName, bytes: item.bytes });
          freed += item.bytes;
        } else {
          failed.push({ path: item.path, reason: outcome.reason });
          run.warn('REMOVE_FAILED', { path: item.path, reason: outcome.reason });
        }
      }

      return {
        freedBytes: freed,
        freedReadable: formatBytes(freed),
        trashed,
        failed,
        partial: failed.length > 0,
        restorable: trashed.length > 0,
      };
    },
  })
);
