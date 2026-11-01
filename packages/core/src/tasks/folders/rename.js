'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'folders.rename',
    title: 'Rename saved folder',
    summary: 'Change the name a saved folder is shown under',
    whenToUse:
      'Giving a saved folder a clearer name in the list. Only the shown name changes; the folder on disk keeps its name. Leaving the name out returns to the folder\'s own name.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: ['SRC_NOT_FOUND'],
    input: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          label: 'Folder',
          type: 'string',
          positional: true,
          description: 'The saved path, as folders.list reports it.',
        },
        name: {
          label: 'Name',
          type: 'string',
          description: 'The name to show. Leave it out to use the folder\'s own name.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name now shown.' },
        folders: { type: 'array', description: 'The whole list after the change.' },
        groups: { type: 'array', description: 'Groups in order, each with name and count.' },
      },
    },
    examples: [
      { description: 'Show a folder as "Work"', command: 'turink-toys folders.rename ~/Desktop/project --name Work' },
      { description: 'Go back to the folder\'s own name', command: 'turink-toys folders.rename ~/Desktop/project' },
    ],
    present(result, t) {
      return { rows: [row(t('result.name', 'Name'), result.name)] };
    },
    async execute(run, input) {
      const outcome = store.rename(store.load(), input.path, input.name);
      store.save(outcome.list);
      const shown = store.snapshot(outcome.list, store.loadGroups(outcome.list));
      return { name: shown.folders.find((f) => f.path === outcome.entry.path).name, ...shown };
    },
  })
);
