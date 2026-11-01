'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { row } = require('../../kernel/present');
const store = require('./store');

const execFileAsync = promisify(execFile);

register(
  defineTask({
    id: 'folders.open',
    title: 'Open saved folder',
    summary: 'Open a saved folder in Finder',
    whenToUse:
      'Opening one of the saved folders for the person. The path must be in the list; an external disk that is not connected is reported rather than opened.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
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
      properties: { opened: { type: 'string', description: 'The folder opened in Finder.' } },
    },
    examples: [{ description: 'Open a saved folder', command: 'turink-toys folders.open ~/Downloads' }],
    present(result, t) {
      return { rows: [row(t('result.opened', 'Opened'), result.opened)] };
    },
    async execute(run, input) {
      const list = store.load();
      const target = store.normalize(input.path);
      const item = store.describe(list).find((folder) => folder.path === target);
      if (!item) {
        fail('SRC_NOT_FOUND', `"${target}" is not in the folder list.`, {
          hint: 'Run "turink-toys folders.list --json" to see the saved paths.',
        });
      }
      if (!item.available) {
        fail('SRC_NOT_FOUND', `${target} cannot be reached right now.`, {
          hint: 'Connect the disk or wait for the cloud folder to sync, then try again.',
        });
      }
      await execFileAsync('/usr/bin/open', [target]);
      return { opened: target };
    },
  })
);
