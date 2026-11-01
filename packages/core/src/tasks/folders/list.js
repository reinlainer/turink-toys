'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'folders.list',
    title: 'Saved folders',
    summary: 'List the folders saved for quick opening',
    whenToUse:
      'Finding the exact saved path before opening, renaming, reordering or removing a folder. Reports whether each folder is currently reachable, since an external disk or a cloud folder can be missing. Reads settings only.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        folders: {
          type: 'array',
          description:
            'Saved folders in the person\'s order. Each has path, name, customName, folderName, group (null when ungrouped), source (desktop, documents, downloads, home, icloud, onedrive, gdrive, dropbox, cloud, volume, disk), place, parents, available and clash (null, place or parent: what tells two entries with the same name apart).',
        },
        groups: {
          type: 'array',
          description: 'Optional groups in their order, each with name and count. Ungrouped folders come before every group.',
        },
      },
    },
    examples: [{ description: 'Show the saved folders', command: 'turink-toys folders.list --json' }],
    present(result, t) {
      const folders = (result && result.folders) || [];
      if (folders.length === 0) return { rows: [row(t('result.folders', 'Folders'), '0')] };
      return {
        rows: folders.map((folder) =>
          row(folder.group ? `${folder.group} › ${folder.name}` : folder.name, folder.path, folder.available ? null : 'warn')
        ),
      };
    },
    async execute() {
      const list = store.load();
      return store.snapshot(list, store.loadGroups(list));
    },
  })
);
