'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const catalog = require('./catalog');
const { scan, formatBytes } = require('./scan');
const { row } = require('../../kernel/present');

register(
  defineTask({
    id: 'disk.report',
    title: 'Disk usage report',
    summary: 'Measure how much space developer caches occupy',
    whenToUse:
      'Finding what is consuming disk space before deciding what to clear. Walks large directory trees, so prefer one call over repeated ones.',
    risk: 'read',
    cost: 'expensive',
    idempotent: true,
    errors: ['UNKNOWN_TARGET'],
    input: {
      type: 'object',
      properties: {
        targets: {
          label: 'Targets',
          type: 'array',
          description: 'Which locations to measure. Leave empty to measure all of them.',
          optionsFrom: {
            task: 'disk.targets',
            list: 'targets',
            value: 'slug',
            label: 'name',
            // Grouped by the tool it belongs to, which is how someone looking
            // for space thinks about it. Whether it rebuilds itself varies
            // within a group, so that rides on the row instead.
            group: 'group',
            badge: 'kind',
            note: 'consequence',
          },
        },
        refresh: {
          label: 'Measure again',
          type: 'boolean',
          default: false,
          description: 'Ignore the cached scan and measure again.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        totalBytes: { type: 'integer', description: 'Sum across every measured target.' },
        results: { type: 'array', description: 'One entry per target, largest first.' },
      },
    },
    examples: [
      {
        description: 'Measure everything',
        command: 'turink-toys disk.report --json',
      },
      {
        description: 'Measure two targets by slug',
        command: 'turink-toys disk.report --targets xcode.deriveddata,gradle.cache --json',
      },
    ],
    present(result, t) {
      const found = ((result && result.results) || []).filter((entry) => entry.exists);
      return {
        rows: [
          row(t('result.total', 'Total'), result.totalReadable),
          row(t('result.inCaches', 'In caches'), result.cacheReadable),
          ...found.slice(0, 8).map((entry) => row(entry.name, entry.readable)),
        ],
        notes:
          found.length === 0
            ? [t('result.nothingFound', 'None of the known locations exist on this machine.')]
            : [],
      };
    },

    async execute(run, input) {
      const selected = resolveTargets(input.targets);
      const { results, scannedAt, fromCache } = scan(selected, run, { useCache: !input.refresh });

      const ranked = [...results].sort((a, b) => b.bytes - a.bytes);
      const totalBytes = ranked.reduce((sum, r) => sum + r.bytes, 0);
      const cacheBytes = ranked
        .filter((r) => r.kind === catalog.CACHE)
        .reduce((sum, r) => sum + r.bytes, 0);

      return {
        scannedAt,
        fromCache,
        totalBytes,
        totalReadable: formatBytes(totalBytes),
        cacheBytes,
        cacheReadable: formatBytes(cacheBytes),
        results: ranked.map((r) => ({
          slug: r.slug,
          name: r.name,
          group: r.group,
          bytes: r.bytes,
          readable: formatBytes(r.bytes),
          files: r.files,
          exists: r.exists,
          kind: r.kind,
          consequence: r.consequence,
        })),
      };
    },
  })
);

function resolveTargets(slugs) {
  if (!slugs || slugs.length === 0) return catalog.all();
  const list = [];
  for (const slug of slugs.flatMap((s) => String(s).split(','))) {
    const target = catalog.get(slug.trim());
    if (!target) {
      fail('UNKNOWN_TARGET', `There is no target with the slug "${slug}".`, {
        hint: 'Run "turink-toys disk.targets --json" for the accepted slugs.',
      });
    }
    list.push(target);
  }
  return list;
}

module.exports = { resolveTargets };
