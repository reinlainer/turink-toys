'use strict';

const path = require('path');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { statOrNull } = require('./files');
const { kindOf, typeOf } = require('./formats');
const store = require('./store');

register(
  defineTask({
    id: 'images.selected',
    title: 'Selected photos',
    summary: 'List the photos picked in the viewer',
    whenToUse:
      'Finding out which photos are selected before copying, moving or trashing them. A selected photo that has since been moved or deleted is reported under missing. Reads the selection only; a missing path is dropped from it the next time images.select changes it.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          description:
            'Selected items that still exist, as { path, folder, name, bytes, modified, kind, type }, the same fields images.list gives plus the folder. type is photo, video or pdf.',
        },
        missing: { type: 'array', description: 'Selected paths that no longer exist.' },
      },
    },
    examples: [{ description: 'Show the selected photos', command: 'turink-toys images.selected --json' }],
    present(result, t) {
      return {
        rows: [
          row(t('result.selected', 'Selected'), String(((result && result.images) || []).length)),
          ((result && result.missing) || []).length > 0
            ? row(t('result.missing', 'Not found'), String(result.missing.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: ((result && result.images) || []).slice(0, 6).map((image) => image.path),
      };
    },
    async execute() {
      const images = [];
      const missing = [];
      for (const file of store.load()) {
        const stat = statOrNull(file);
        // The same fields as images.list, so a screen can show a picked video
        // or PDF as what it is wherever it was picked from.
        if (stat && stat.isFile()) {
          const name = path.basename(file);
          images.push({
            path: file,
            folder: path.dirname(file),
            name,
            bytes: stat.size,
            modified: stat.mtime.toISOString(),
            kind: kindOf(name),
            type: typeOf(name),
          });
        }
        else missing.push(file);
      }
      return { images, missing };
    },
  })
);
