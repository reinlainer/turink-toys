'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { row } = require('../../kernel/present');
const store = require('./store');

const REASONS = {
  'no-image': 'The clipboard holds no image.',
  file: 'The clipboard holds a file, not an image. Files copied in Finder are not kept.',
  skipped: 'The clipboard content is marked as private or was put there from the gallery, so it is not kept.',
  unreadable: 'The image on the clipboard could not be read.',
};

register(
  defineTask({
    id: 'clipboard.save',
    title: 'Keep the clipboard image',
    summary: 'Keep the image on the clipboard now',
    whenToUse:
      'Keeping the image currently on the clipboard without waiting for collection, for example from a script or while Turink Toys is closed. An image already kept is reported as a duplicate rather than saved twice.',
    risk: 'create',
    cost: 'instant',
    idempotent: true,
    errors: ['NO_IMAGE', 'HELPER_MISSING', 'FAILED'],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Where the image was kept; null when duplicate is true.' },
        duplicate: { type: 'boolean', description: 'True when the same image was already kept.' },
      },
    },
    examples: [{ description: 'Keep what is on the clipboard', command: 'turink-toys clipboard.save --json' }],
    present(result, t) {
      return {
        rows: [
          result && result.duplicate
            ? row(t('result.duplicate', 'Already kept'), t('result.yes', 'Yes'))
            : row(t('result.saved', 'Kept'), result && result.path, 'good'),
        ],
      };
    },
    async execute() {
      const outcome = await store.helper(['save', '--dir', store.FOLDER]);
      if (outcome.saved) return { path: outcome.saved, duplicate: false };
      if (outcome.duplicate) return { path: null, duplicate: true };
      if (REASONS[outcome.reason]) fail('NO_IMAGE', REASONS[outcome.reason], { hint: 'Copy an image, then run this again.' });
      fail('FAILED', outcome.message || `The image could not be kept (${outcome.reason}).`);
    },
  })
);
