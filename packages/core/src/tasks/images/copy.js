'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { transfer } = require('./files');

register(
  defineTask({
    id: 'images.copy',
    title: 'Copy photos',
    summary: 'Copy photos, videos or PDFs into another folder',
    whenToUse:
      'Putting copies of photos, videos or PDFs in a folder, for example the ones picked with images.select. A name already taken in the folder is never overwritten: the copy becomes "name 2.jpg", "name 3.jpg" and so on. Photos that cannot be copied are listed under failed while the rest go through.',
    risk: 'create',
    cost: 'proportional',
    idempotent: false,
    errors: ['SRC_NOT_FOUND', 'NOT_A_FOLDER', 'NOT_AN_IMAGE', 'PARTIAL'],
    input: {
      type: 'object',
      required: ['paths', 'to'],
      properties: {
        paths: {
          label: 'Photos',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'The photos to copy, by path.',
        },
        to: {
          label: 'Destination folder',
          type: 'string',
          description: 'An existing folder to copy into. "~" stands for the home folder.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        copied: { type: 'array', description: 'Each copy as { from, to }, where "to" is the name it was given.' },
        failed: { type: 'array', description: 'Photos that could not be copied, as { path, message }.' },
      },
    },
    examples: [
      { description: 'Copy two photos into a folder', command: 'turink-toys images.copy ~/Pictures/a.jpg ~/Pictures/b.jpg --to ~/Desktop/trip --json' },
    ],
    present(result, t) {
      return {
        rows: [
          row(t('result.copied', 'Copied'), String(((result && result.copied) || []).length), 'good'),
          row(t('result.destination', 'Destination'), result && result.folder),
          ((result && result.failed) || []).length > 0
            ? row(t('result.failed', 'Failed'), String(result.failed.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: ((result && result.failed) || []).map((item) => `${t('result.notCopied', 'Not copied')}: ${item.path}`),
      };
    },
    async execute(run, input) {
      const { folder, done, failed } = await transfer(run, 'copy', input.paths, input.to);
      return { folder, copied: done, failed, partial: failed.length > 0 };
    },
  })
);
