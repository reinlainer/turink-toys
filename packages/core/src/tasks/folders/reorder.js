'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { fail } = require('../../kernel/errors');
const store = require('./store');

register(
  defineTask({
    id: 'folders.reorder',
    title: 'Reorder folders',
    summary: 'Move a saved folder to another position or group',
    whenToUse:
      'Changing where a folder appears in the menu bar and the window. Position counts within the folder\'s section, 1 being its top; a number past the end moves it to the bottom. Give a group to move it into that group, or ungrouped to take it out of any group.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: ['SRC_NOT_FOUND'],
    input: {
      type: 'object',
      required: ['path', 'position'],
      properties: {
        path: {
          label: 'Folder',
          type: 'string',
          positional: true,
          description: 'The saved path, as folders.list reports it.',
        },
        position: {
          label: 'Position',
          type: 'integer',
          minimum: 1,
          description: 'Where to put it within its section, counting from 1 at the top.',
        },
        group: {
          label: 'Group',
          type: 'string',
          description: 'Move it into this group. It must exist already.',
        },
        ungrouped: {
          label: 'Ungrouped',
          type: 'boolean',
          default: false,
          description: 'Take it out of its group.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        position: { type: 'integer', description: 'Where the folder ended up within its section.' },
        folders: { type: 'array', description: 'The whole list after the change.' },
        groups: { type: 'array', description: 'Groups in order, each with name and count.' },
      },
    },
    examples: [
      { description: 'Move a folder to the top of its section', command: 'turink-toys folders.reorder ~/Downloads --position 1' },
      { description: 'Move a folder into a group', command: 'turink-toys folders.reorder ~/Downloads --group Work --position 1' },
      { description: 'Take a folder out of its group', command: 'turink-toys folders.reorder ~/Downloads --ungrouped --position 99' },
    ],
    present(result, t) {
      return { rows: [row(t('result.position', 'Position'), String(result.position))] };
    },
    async execute(run, input) {
      const list = store.load();
      const groups = store.loadGroups(list);
      if (input.group !== undefined && input.ungrouped) {
        fail('INVALID_INPUT', 'Give a group or ungrouped, not both.', { hint: 'Leave both out to keep the folder in its group.' });
      }
      const group = input.ungrouped ? null : input.group !== undefined ? store.findGroup(groups, input.group) : undefined;
      const outcome = store.reorder(list, input.path, input.position, undefined, group);
      store.save(outcome.list);
      return { position: outcome.position, ...store.snapshot(outcome.list, groups) };
    },
  })
);
