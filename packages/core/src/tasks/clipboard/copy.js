'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'clipboard.copy',
    title: 'Copy to the clipboard',
    summary: 'Put kept images back on the clipboard',
    whenToUse:
      'Pasting a kept image again: the images go on the clipboard as images, the way a screenshot does, replacing what the clipboard held. Several images go on as separate items for apps that accept several. Only images reported by clipboard.list are accepted. Putting them back does not keep them a second time.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    errors: ['NOT_KEPT', 'SRC_NOT_FOUND', 'HELPER_MISSING', 'FAILED'],
    input: {
      type: 'object',
      required: ['paths'],
      properties: {
        paths: {
          label: 'Images',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'The kept images to put on the clipboard, by path.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        copied: { type: 'integer', description: 'How many images are now on the clipboard.' },
      },
    },
    examples: [
      { description: 'Put one kept image back on the clipboard', command: 'turink-toys clipboard.copy "~/Library/Application Support/turink-toys/clipboard/20261117-101500-0123456789ab.png" --json' },
    ],
    present(result, t) {
      return { rows: [row(t('result.copied', 'Copied'), String((result && result.copied) || 0), 'good')] };
    },
    async execute(run, input) {
      const paths = store.requireKept(input.paths);
      const outcome = await store.helper(['copy', ...paths]);
      if (!outcome || !outcome.copied) {
        fail('FAILED', 'The clipboard did not accept the images.', { retryable: true });
      }
      return { copied: outcome.copied };
    },
  })
);
