'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const reverser = require('./reverser');
const { presentWheel } = require('./present');

register(
  defineTask({
    id: 'mouse.status',
    title: 'Mouse wheel status',
    summary: 'Report whether the mouse wheel direction is reversed',
    whenToUse:
      'Checking whether wheel reversal is on and whether its helper is running or still waiting for the Accessibility permission. Reads state only.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        reversing: { type: 'boolean', description: 'Whether wheel reversal is turned on.' },
        helper: {
          type: 'string',
          description: 'off, stopped, starting, needs-permission or active. Only active means the wheel is being reversed.',
        },
      },
    },
    examples: [{ description: 'Read the current state', command: 'turink-toys mouse.status --json' }],
    present: presentWheel,

    async execute() {
      return reverser.status();
    },
  })
);
