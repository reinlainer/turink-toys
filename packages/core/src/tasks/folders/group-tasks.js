'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

// Groups are optional headings over the saved folders. Each change returns the
// whole list and the groups so a front end can redraw from one answer.

const GROUP_OUTPUT = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'The group the change applied to.' },
    folders: { type: 'array', description: 'The whole list after the change, as folders.list reports it.' },
    groups: { type: 'array', description: 'Groups in order, each with name and count.' },
  },
};

const GROUP_INPUT = {
  label: 'Group',
  type: 'string',
  positional: true,
  description: 'The group\'s name, as folders.list reports it.',
};

function shown(t) {
  return (result) => ({ rows: [row(t('result.group', 'Group'), result.name)] });
}

register(
  defineTask({
    id: 'folders.add-group',
    title: 'Add folder group',
    summary: 'Create a group to gather saved folders under',
    whenToUse:
      'Making a heading for related folders, such as one project\'s folders, in the menu bar and the window. Groups are optional; folders outside any group stay at the top. Names must differ from existing groups, ignoring letter case.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: false,
    preference: true,
    errors: ['INVALID_INPUT', 'DEST_EXISTS'],
    input: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { label: 'Name', type: 'string', positional: true, description: 'The new group\'s name.' },
        position: {
          label: 'Position',
          type: 'integer',
          minimum: 1,
          description: 'Where to put it among the groups, counting from 1. Leave it out to add it last.',
        },
      },
    },
    output: GROUP_OUTPUT,
    examples: [{ description: 'Create a group', command: 'turink-toys folders.add-group Work' }],
    present(result, t) {
      return shown(t)(result);
    },
    async execute(run, input) {
      const list = store.load();
      const outcome = store.addGroup(store.loadGroups(list), input.name, input.position);
      store.saveGroups(outcome.groups);
      return { name: outcome.name, ...store.snapshot(list, outcome.groups) };
    },
  })
);

register(
  defineTask({
    id: 'folders.rename-group',
    title: 'Rename folder group',
    summary: 'Change a group\'s name',
    whenToUse: 'Renaming a group of saved folders. The folders stay in it.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: ['SRC_NOT_FOUND', 'INVALID_INPUT', 'DEST_EXISTS'],
    input: {
      type: 'object',
      required: ['group', 'name'],
      properties: {
        group: GROUP_INPUT,
        name: { label: 'New name', type: 'string', description: 'The name to give the group.' },
      },
    },
    output: GROUP_OUTPUT,
    examples: [{ description: 'Rename a group', command: 'turink-toys folders.rename-group Work --name Clients' }],
    present(result, t) {
      return shown(t)(result);
    },
    async execute(run, input) {
      const list = store.load();
      const outcome = store.renameGroup(list, store.loadGroups(list), input.group, input.name);
      store.save(outcome.list);
      store.saveGroups(outcome.groups);
      return { name: outcome.name, ...store.snapshot(outcome.list, outcome.groups) };
    },
  })
);

register(
  defineTask({
    id: 'folders.remove-group',
    title: 'Remove folder group',
    summary: 'Remove a group and keep its folders',
    whenToUse:
      'Removing a group heading. Its folders are not removed: they move to the end of the ungrouped section, and nothing on disk changes.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: false,
    preference: true,
    errors: ['SRC_NOT_FOUND'],
    input: {
      type: 'object',
      required: ['group'],
      properties: { group: GROUP_INPUT },
    },
    output: GROUP_OUTPUT,
    examples: [{ description: 'Remove a group', command: 'turink-toys folders.remove-group Work' }],
    present(result, t) {
      return shown(t)(result);
    },
    async execute(run, input) {
      const list = store.load();
      const outcome = store.removeGroup(list, store.loadGroups(list), input.group);
      store.save(outcome.list);
      store.saveGroups(outcome.groups);
      return { name: outcome.name, released: outcome.released, ...store.snapshot(outcome.list, outcome.groups) };
    },
  })
);

register(
  defineTask({
    id: 'folders.reorder-group',
    title: 'Reorder folder groups',
    summary: 'Move a group to another position among the groups',
    whenToUse:
      'Changing the order of the group headings. Position 1 is the first group; ungrouped folders always come before every group.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: ['SRC_NOT_FOUND'],
    input: {
      type: 'object',
      required: ['group', 'position'],
      properties: {
        group: GROUP_INPUT,
        position: { label: 'Position', type: 'integer', minimum: 1, description: 'Where to put it, counting from 1.' },
      },
    },
    output: GROUP_OUTPUT,
    examples: [{ description: 'Make a group the first one', command: 'turink-toys folders.reorder-group Work --position 1' }],
    present(result, t) {
      return shown(t)(result);
    },
    async execute(run, input) {
      const list = store.load();
      const groups = store.loadGroups(list);
      const name = store.findGroup(groups, input.group);
      const outcome = store.reorderGroup(groups, name, input.position);
      store.saveGroups(outcome.groups);
      return { name, position: outcome.position, ...store.snapshot(list, outcome.groups) };
    },
  })
);
