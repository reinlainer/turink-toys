'use strict';

const fs = require('fs');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { row } = require('../../kernel/present');
const { normalize } = require('../folders/store');
const { requireImages } = require('./files');
const store = require('./store');

register(
  defineTask({
    id: 'images.select',
    title: 'Select photos',
    summary: 'Add photos, videos or PDFs to the selection, take them off it, or clear it',
    whenToUse:
      'Picking the photos, videos or PDFs that images.copy, images.move or images.trash will then work on, and the viewer shows as selected. Only the saved selection changes; no file is touched. Files already selected stay as they are, and when the selection changes, paths that no longer exist are dropped from it.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    preference: true,
    errors: ['SRC_NOT_FOUND', 'NOT_AN_IMAGE', 'INVALID_INPUT'],
    input: {
      type: 'object',
      properties: {
        paths: {
          label: 'Photos',
          type: 'array',
          positional: true,
          description: 'The photos to add to the selection, or to take off it with off.',
        },
        off: {
          label: 'Deselect',
          type: 'boolean',
          default: false,
          description: 'Take the photos off the selection instead of adding them.',
        },
        clear: {
          label: 'Clear',
          type: 'boolean',
          default: false,
          description: 'Empty the whole selection. No photos need to be named.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        selected: { type: 'integer', description: 'How many photos are selected afterwards.' },
        changed: { type: 'array', description: 'The paths that were added or taken off.' },
      },
    },
    examples: [
      { description: 'Select two photos', command: 'turink-toys images.select ~/Pictures/a.jpg ~/Pictures/b.jpg --json' },
      { description: 'Take one off the selection', command: 'turink-toys images.select ~/Pictures/a.jpg --off' },
      { description: 'Clear the selection', command: 'turink-toys images.select --clear' },
    ],
    present(result, t) {
      return { rows: [row(t('result.selected', 'Selected'), String(result.selected), 'good')] };
    },
    async execute(run, input) {
      const named = input.paths || [];
      if (!input.clear && named.length === 0) {
        fail('INVALID_INPUT', 'Name at least one file, or use --clear.', {
          hint: 'Run "turink-toys help images.select" for an example.',
        });
      }

      // Taking a photo off must work for one that has since been deleted, so
      // only adding insists the path is a photo that exists.
      const paths = input.clear ? [] : input.off ? named.map((entry) => normalize(entry)) : requireImages(named).map((entry) => entry.path);

      const list = store.load();
      const outcome = store.change(list, { paths, off: input.off, clear: input.clear }, fs.existsSync);
      if (outcome.changed.length > 0) store.save(outcome.list);
      return { selected: outcome.list.length, changed: outcome.changed };
    },
  })
);
