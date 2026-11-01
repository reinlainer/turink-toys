'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'folders.add',
    title: 'Add folder',
    summary: 'Save a folder for quick opening',
    whenToUse:
      'Adding a folder to the list the menu bar and the window open from. The folder goes to the end of its section: the ungrouped one, or the named group, which is created if it does not exist yet. A folder already in the list is left where it is and reported as a duplicate.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: ['SRC_NOT_FOUND', 'INVALID_INPUT'],
    input: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          label: 'Folder',
          type: 'string',
          positional: true,
          description: 'The folder to save. "~" stands for the home folder.',
        },
        name: {
          label: 'Name',
          type: 'string',
          description: 'The name to show instead of the folder\'s own name.',
        },
        group: {
          label: 'Group',
          type: 'string',
          description: 'The group to put it in. Leave it out to keep it ungrouped.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        added: { type: 'boolean', description: 'False when the folder was already in the list.' },
        folders: { type: 'array', description: 'The whole list after the change, as folders.list reports it.' },
        groups: { type: 'array', description: 'Groups in order, each with name and count.' },
      },
    },
    examples: [
      { description: 'Save a folder', command: 'turink-toys folders.add ~/Desktop/project --json' },
      { description: 'Save it under another name', command: 'turink-toys folders.add ~/Desktop/project --name Work' },
    ],
    present(result, t) {
      return {
        rows: [
          row(
            t('result.folder', 'Folder'),
            result.path,
            result.added ? 'good' : null
          ),
          result.added ? null : row(t('result.status', 'Status'), t('result.alreadySaved', 'Already in the list')),
        ].filter(Boolean),
      };
    },
    async execute(run, input) {
      let groups = store.loadGroups(store.load());
      let group;
      if (input.group !== undefined) {
        const existing = groups.find((name) => name.toLocaleLowerCase() === String(input.group).trim().toLocaleLowerCase());
        if (existing) group = existing;
        else ({ groups, name: group } = store.addGroup(groups, input.group));
      }
      const outcome = store.add(store.load(), input.path, input.name, undefined, group);
      if (outcome.added) {
        store.save(outcome.list);
        store.saveGroups(groups);
      }
      const shown = store.snapshot(outcome.list, outcome.added ? groups : store.loadGroups(outcome.list));
      return { added: outcome.added, path: outcome.list[outcome.index].path, ...shown };
    },
  })
);
