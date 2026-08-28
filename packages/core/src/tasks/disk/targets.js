'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const catalog = require('./catalog');
const { row, formatBytes } = require('../../kernel/present');


// Separated from disk.report because building a valid --targets argument should
// not cost a filesystem walk. This returns immediately and tells the caller
// which slugs exist and what removing each one actually costs.

register(
  defineTask({
    id: 'disk.targets',
    title: 'List cleanup targets',
    summary: 'List the known cleanup locations, their slugs and what removing each costs',
    whenToUse:
      'Before calling disk.report or disk.clean, to learn the slug names those tasks accept and what removing each one costs. Returns immediately and reads no files.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: {
      type: 'object',
      properties: {
        kind: {
          label: 'Kind',
          type: 'string',
          enum: ['cache', 'toolchain'],
          description:
            'Limit the list to caches, which are rebuilt automatically, or to toolchains, which have to be reinstalled.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        targets: { type: 'array', description: 'Slug, name, group, kind and consequence.' },
      },
    },
    examples: [
      {
        description: 'See every known target',
        command: 'turink-toys disk.targets --json',
      },
      {
        description: 'See only the locations that are rebuilt automatically',
        command: 'turink-toys disk.targets --kind cache --json',
      },
    ],
    present(result, t) {
      return {
        rows: ((result && result.targets) || []).map((target) =>
          row(
            target.name,
            target.kind === 'cache'
              ? t('ui.kindCache', 'rebuilt automatically')
              : t('ui.kindToolchain', 'needs reinstalling'),
            target.kind === 'cache' ? null : 'warn'
          )
        ),
      };
    },

    async execute(run, input) {
      const list = input.kind ? catalog.all().filter((t) => t.kind === input.kind) : catalog.all();
      return {
        targets: list.map((t) => ({
          slug: t.slug,
          name: t.name,
          group: t.group,
          path: t.path,
          kind: t.kind,
          consequence: t.consequence,
          custom: t.custom === true,
          reclassified: t.reclassified === true,
        })),
        cacheCount: catalog.caches().length,
        toolchainCount: catalog.toolchains().length,
        userTargetsFile: catalog.USER_FILE,
      };
    },
  })
);
