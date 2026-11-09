'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { OUR_APP, FALLBACK_APP, status, setDefaults, summarize } = require('./default-app');

register(
  defineTask({
    id: 'images.set-default-app',
    title: 'Set photo default app',
    summary: 'Make an application the default for photo types, or give them back to Preview',
    whenToUse:
      'Making Turink Toys (or another application) open photos by default, or undoing that. Changes the system-wide default for JPEG, PNG, HEIC, HEIF, TIFF, GIF, WebP, AVIF and BMP files. macOS may ask for confirmation once per type, and a type that is declined stays as it was. Types the application already opens are left alone. With restore, only the types the application currently opens are handed back to Preview.',
    risk: 'mutate',
    cost: 'expensive',
    idempotent: true,
    preference: true,
    errors: ['HELPER_MISSING'],
    input: {
      type: 'object',
      properties: {
        app: {
          label: 'Application',
          type: 'string',
          default: OUR_APP,
          description: 'The bundle identifier to make the default. Defaults to Turink Toys.',
        },
        restore: {
          label: 'Restore',
          type: 'boolean',
          default: false,
          description: 'Give the types the application currently opens back to Preview instead of making it the default.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        results: { type: 'array', description: 'Each type that was changed or attempted, as { uti, name, result, message }. result is applied, kept (not changed, for example because it was declined) or error.' },
        applied: { type: 'integer', description: 'How many types were changed.' },
        kept: { type: 'integer', description: 'How many types stayed as they were.' },
        failed: { type: 'integer', description: 'How many types could not be changed.' },
        app: { type: 'string', description: 'The bundle identifier acted on.' },
        types: { type: 'array', description: 'The state afterwards, as images.default-app reports it.' },
        allOurs: { type: 'boolean', description: 'Whether app opens every type afterwards.' },
      },
    },
    examples: [
      { description: 'Open photos with Turink Toys', command: 'turink-toys images.set-default-app --json' },
      { description: 'Give photos back to Preview', command: 'turink-toys images.set-default-app --restore --json' },
    ],
    present(result, t) {
      return {
        rows: [
          row(t('result.applied', 'Changed'), String((result && result.applied) || 0), 'good'),
          result && result.kept > 0 ? row(t('result.kept', 'Unchanged'), String(result.kept), 'warn') : null,
          result && result.failed > 0 ? row(t('result.failed', 'Failed'), String(result.failed), 'warn') : null,
        ].filter(Boolean),
      };
    },
    async execute(run, input) {
      const app = input.app || OUR_APP;
      const before = await status(app);

      // Only what would actually change is sent to the helper, because each
      // type costs the person a prompt and a no-op is not worth one.
      const target = input.restore ? FALLBACK_APP : app;
      const utis = before.types.filter((type) => (input.restore ? type.ours : !type.ours)).map((type) => type.uti);
      const results = await setDefaults(target, utis);

      const after = await status(app);
      return { ...summarize(results), results, app, types: after.types, allOurs: after.allOurs };
    },
  })
);
