'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const reverser = require('./reverser');
const { presentWheel } = require('./present');

register(
  defineTask({
    id: 'mouse.reverse',
    title: 'Reverse mouse wheel',
    summary: 'Reverse the scroll direction of mouse wheels and leave the trackpad as it is',
    whenToUse:
      'Using a wheel mouse in the opposite direction to the trackpad, since the system natural scrolling setting changes both. Applies to every mouse whose wheel moves in notches; the trackpad and Magic Mouse are not affected. A mouse already reversed by its own software is reversed twice, so turn one of them off. The first time, the Accessibility permission must be granted in System Settings, which an agent cannot do.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    errors: ['HELPER_MISSING', 'LOCKED'],
    input: {
      type: 'object',
      properties: {
        off: {
          label: 'Turn off',
          type: 'boolean',
          default: false,
          description: 'Stop reversing and return the wheel to the system setting.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        reversing: { type: 'boolean', description: 'Whether wheel reversal is turned on.' },
        helper: {
          type: 'string',
          description: 'off, stopped, starting, needs-permission or active. Only active means the wheel is being reversed.',
        },
        replaced: { type: 'boolean', description: 'Whether a newer helper replaced the installed one, which needs the permission again.' },
      },
    },
    examples: [
      { description: 'Reverse the mouse wheel', command: 'turink-toys mouse.reverse' },
      { description: 'Return to the system direction', command: 'turink-toys mouse.reverse --off' },
    ],
    present: presentWheel,

    async execute(run, input) {
      if (input.off) {
        const result = await reverser.disable();
        run.info(result.stopped ? 'Wheel reversal turned off.' : 'Wheel reversal was already off.');
        return result;
      }
      const result = await reverser.enable();
      run.info(`Wheel reversal on; helper ${result.helper}.`);
      return result;
    },
  })
);
