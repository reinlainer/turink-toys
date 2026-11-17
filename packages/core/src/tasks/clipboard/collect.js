'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'clipboard.collect',
    title: 'Collect clipboard images',
    summary: 'Turn keeping clipboard images on or off',
    whenToUse:
      'Choosing whether Turink Toys keeps every image copied to the clipboard while it is open. Off by default. Turning it off keeps the images already collected.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: [],
    input: {
      type: 'object',
      required: ['on'],
      properties: {
        on: {
          label: 'Collect',
          type: 'boolean',
          positional: true,
          description: 'true to keep new clipboard images, false to stop.',
        },
      },
    },
    output: {
      type: 'object',
      properties: { collecting: { type: 'boolean', description: 'Whether collection is now on.' } },
    },
    examples: [
      { description: 'Start collecting', command: 'turink-toys clipboard.collect true --json' },
      { description: 'Stop collecting', command: 'turink-toys clipboard.collect false --json' },
    ],
    present(result, t) {
      return { rows: [row(t('result.collecting', 'Collecting'), result && result.collecting ? t('result.on', 'On') : t('result.off', 'Off'))] };
    },
    async execute(run, input) {
      return { collecting: store.setCollecting(input.on) };
    },
  })
);
