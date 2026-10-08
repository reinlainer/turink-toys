'use strict';

const path = require('path');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { assertUnderHome, assertAppBundle } = require('../../kernel/paths');
const { moveToTrash } = require('../../kernel/trash');
const { formatBytes } = require('../../kernel/format');
const { row } = require('../../kernel/present');
const { listApps, findLeftovers, sizeOf } = require('./bundles');

// A caller may name an application the way it knows it: the path apps.list
// reported, the bundle identifier, or the name shown in Finder.
function resolveApps(requested, installed) {
  const chosen = [];
  for (const raw of requested) {
    const wanted = String(raw).trim();
    const lower = wanted.toLowerCase();
    const matches = installed.filter(
      (app) =>
        app.path === path.resolve(wanted) ||
        app.bundleId === wanted ||
        app.names.some((name) => name.toLowerCase() === lower)
    );

    if (matches.length === 0) {
      fail('UNKNOWN_APP', `No installed application matches "${wanted}".`, {
        hint: 'Run "turink-toys apps.list --json" and pass a path, bundle identifier or name from it.',
        details: { app: wanted },
      });
    }
    if (matches.length > 1) {
      fail('UNKNOWN_APP', `"${wanted}" matches more than one application.`, {
        hint: `Pass the path instead: ${matches.map((app) => app.path).join(', ')}.`,
        details: { app: wanted },
      });
    }

    const app = matches[0];
    if (app.protected) {
      fail('APP_PROTECTED', `${app.name} cannot be removed by this tool.`, {
        hint:
          app.protected === 'system'
            ? 'Applications protected by System Integrity Protection ship with macOS and are left alone.'
            : 'Turink Toys is removed with "brew uninstall --cask turink-toys".',
        details: { app: app.name },
      });
    }
    if (app.running) {
      fail('APP_RUNNING', `${app.name} is running.`, {
        hint: `Quit ${app.name}, then run the same command again.`,
        retryable: true,
        details: { app: app.name },
      });
    }
    if (!chosen.includes(app)) chosen.push(app);
  }
  return chosen;
}

register(
  defineTask({
    id: 'apps.uninstall',
    title: 'Remove applications',
    summary: 'Move applications and the files they left in the Library to the Trash',
    whenToUse:
      'Removing an application completely. The plan lists the application and every settings, cache and data folder found under its bundle identifier, each with the basis for including it. Everything goes to the Trash and apps.restore puts it back.',
    risk: 'destroy',
    cost: 'proportional',
    idempotent: false,
    errors: ['UNKNOWN_APP', 'APP_PROTECTED', 'APP_RUNNING', 'NEEDS_CONFIRM', 'PLAN_MISMATCH', 'NEEDS_PRIVILEGE', 'LOCKED', 'PARTIAL'],
    input: {
      type: 'object',
      required: ['apps'],
      properties: {
        apps: {
          label: 'Applications',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'Which applications to remove, by path, bundle identifier or name.',
          optionsFrom: {
            task: 'apps.list',
            list: 'apps',
            value: 'path',
            label: 'name',
            note: 'version',
          },
        },
        keepData: {
          label: 'Keep data',
          type: 'boolean',
          default: false,
          description: 'Remove only the application and leave its settings and data in place.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        freedBytes: { type: 'integer', description: 'Space moved to the Trash.' },
        trashed: { type: 'array', description: 'Paths moved, with their original locations and names in the Trash.' },
      },
    },
    examples: [
      {
        description: 'Ask what removing an application would move to the Trash',
        command: 'turink-toys apps.uninstall "ChatGPT" --json',
      },
      {
        description: 'Confirm the plan returned by the previous call',
        command: 'turink-toys apps.uninstall "ChatGPT" --confirm sha256:… --json',
      },
      {
        description: 'Remove only the application, keeping its settings',
        command: 'turink-toys apps.uninstall com.example.editor --keep-data --json',
      },
    ],

    // The application comes first in each group so that, if it cannot be
    // moved, its data is left alone rather than removed from under it.
    async plan(run, input) {
      const installed = await listApps();
      const chosen = resolveApps(input.apps, installed);

      const items = [];
      for (const app of chosen) {
        assertAppBundle(app.path);
        items.push({ app: app.name, kind: 'app', basis: 'bundle', path: app.path, bytes: sizeOf(app.path) });
        if (input.keepData || !app.bundleId) continue;
        for (const leftover of findLeftovers(app, installed)) {
          assertUnderHome(leftover.path);
          items.push({ app: app.name, kind: 'data', ...leftover });
        }
      }

      const bytes = items.reduce((sum, item) => sum + item.bytes, 0);
      const data = items.filter((item) => item.kind === 'data').length;
      return {
        items,
        bytes,
        summary: `${chosen.map((app) => app.name).join(', ')} and ${data} related item(s), ${formatBytes(bytes)}`,
      };
    },

    present(result, t) {
      return {
        rows: [
          row(t('result.appsRemoved', 'Applications removed'), ((result && result.apps) || []).join(', '), 'good'),
          row(t('result.reclaimed', 'Reclaimed'), result.freedReadable),
          ((result && result.failed) || []).length > 0
            ? row(t('result.failed', 'Failed'), String(result.failed.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: [result && result.restorable ? t('result.restorable', 'Moved to the Trash and can be restored.') : null],
      };
    },

    async execute(run, input, plan) {
      const trashed = [];
      const failed = [];
      const removedApps = [];
      const skippedApps = new Set();
      let freed = 0;

      for (const [index, item] of plan.items.entries()) {
        run.progress(index + 1, plan.items.length, item.path, 'path');
        if (skippedApps.has(item.app)) continue;

        const outcome = await moveToTrash(item.path);
        if (outcome.ok) {
          trashed.push({ app: item.app, kind: item.kind, from: item.path, trashName: outcome.trashName, bytes: item.bytes });
          freed += item.bytes;
          if (item.kind === 'app') removedApps.push(item.app);
        } else {
          failed.push({ path: item.path, reason: outcome.reason });
          run.warn('REMOVE_FAILED', { path: item.path, reason: outcome.reason });
          if (item.kind === 'app') skippedApps.add(item.app);
        }
      }

      return {
        apps: removedApps,
        freedBytes: freed,
        freedReadable: formatBytes(freed),
        trashed,
        failed,
        partial: failed.length > 0,
        restorable: trashed.length > 0,
      };
    },
  })
);
