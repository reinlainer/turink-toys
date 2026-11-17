'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const store = require('./store');

register(
  defineTask({
    id: 'clipboard.list',
    title: 'Clipboard images',
    summary: 'List the images kept from the clipboard, the last day apart from the rest',
    whenToUse:
      'Seeing which images have been kept from the clipboard, for example to put one back with clipboard.copy or to remove some with images.trash. While collection is on and Turink Toys is open, every image copied to the clipboard, such as a screenshot taken with Control held down, is kept here once; files copied in Finder and content password managers mark as private are not. Nothing is removed automatically. Reads the folder only.',
    risk: 'read',
    cost: 'cheap',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'The folder the images are kept in.' },
        collecting: { type: 'boolean', description: 'Whether new clipboard images are being kept while Turink Toys is open. Change it with clipboard.collect.' },
        recent: { type: 'array', description: 'Images kept in the last 24 hours, newest first, as { name, path, bytes, saved, type }.' },
        older: { type: 'array', description: 'Images kept before that, newest first, in the same shape.' },
      },
    },
    examples: [{ description: 'List the kept images', command: 'turink-toys clipboard.list --json' }],
    present(result, t) {
      return {
        rows: [
          row(t('result.folder', 'Folder'), result && result.folder),
          row(t('result.recent', 'Last 24 hours'), String(((result && result.recent) || []).length)),
          row(t('result.older', 'Older'), String(((result && result.older) || []).length)),
        ],
      };
    },
    async execute() {
      const { recent, older } = await store.listKept();
      return { folder: store.FOLDER, collecting: store.collecting(), recent, older };
    },
  })
);
