'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { transfer } = require('./files');

register(
  defineTask({
    id: 'images.move',
    title: 'Move photos',
    summary: 'Move photos, videos or PDFs into another folder',
    whenToUse:
      'Filing photos, videos or PDFs into a folder. A name already taken in the folder is never overwritten: the photo arrives as "name 2.jpg", "name 3.jpg" and so on. A moved photo that is in the selection stays selected under its new path. Photos that cannot be moved are listed under failed while the rest go through.',
    risk: 'mutate',
    cost: 'proportional',
    idempotent: false,
    errors: ['SRC_NOT_FOUND', 'NOT_A_FOLDER', 'NOT_AN_IMAGE', 'LOCKED', 'PARTIAL'],
    input: {
      type: 'object',
      required: ['paths', 'to'],
      properties: {
        paths: {
          label: 'Photos',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'The photos to move, by path.',
        },
        to: {
          label: 'Destination folder',
          type: 'string',
          description: 'An existing folder to move into. "~" stands for the home folder.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        moved: { type: 'array', description: 'Each photo as { from, to }, where "to" is the name it was given.' },
        failed: { type: 'array', description: 'Photos that could not be moved, as { path, message }.' },
      },
    },
    examples: [
      { description: 'Move a photo into a folder', command: 'turink-toys images.move ~/Pictures/a.jpg --to ~/Desktop/trip --json' },
    ],
    present(result, t) {
      return {
        rows: [
          row(t('result.moved', 'Moved'), String(((result && result.moved) || []).length), 'good'),
          row(t('result.destination', 'Destination'), result && result.folder),
          ((result && result.failed) || []).length > 0
            ? row(t('result.failed', 'Failed'), String(result.failed.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: ((result && result.failed) || []).map((item) => `${t('result.notMoved', 'Not moved')}: ${item.path}`),
      };
    },
    async execute(run, input) {
      const { folder, done, failed } = await transfer(run, 'move', input.paths, input.to);
      return { folder, moved: done, failed, partial: failed.length > 0 };
    },
  })
);
