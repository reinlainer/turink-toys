'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'folders.remove',
    title: 'Remove folder',
    summary: 'Take a folder off the saved list',
    whenToUse:
      'Removing a folder from the quick-open list. The folder itself and its contents are not touched.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: false,
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
      },
    },
    output: {
      type: 'object',
      properties: {
        removed: { type: 'string', description: 'The path taken off the list.' },
        folders: { type: 'array', description: 'The whole list after the change.' },
        groups: { type: 'array', description: 'Groups in order, each with name and count.' },
      },
    },
    examples: [{ description: 'Remove a saved folder', command: 'turink-toys folders.remove ~/Desktop/project' }],
    present(result, t) {
      return { rows: [row(t('result.folderRemoved', 'Removed from the list'), result.removed)] };
    },
    async execute(run, input) {
      const outcome = store.remove(store.load(), input.path);
      store.save(outcome.list);
      return { removed: outcome.removed.path, group: outcome.removed.group || null, ...store.snapshot(outcome.list, store.loadGroups(outcome.list)) };
    },
  })
);
