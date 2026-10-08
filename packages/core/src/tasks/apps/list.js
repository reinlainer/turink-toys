'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { listApps } = require('./bundles');

register(
  defineTask({
    id: 'apps.list',
    title: 'List applications',
    summary: 'List installed applications that can be removed',
    whenToUse:
      'Before calling apps.uninstall, to learn the exact name, bundle identifier and path it accepts, and whether the application is running. Reads application metadata only, not their contents.',
    risk: 'read',
    cost: 'cheap',
    idempotent: true,
    errors: [],
    input: {
      type: 'object',
      properties: {
        all: {
          label: 'Include protected',
          type: 'boolean',
          default: false,
          description: 'Also list applications that cannot be removed, such as those that ship with macOS.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        apps: {
          type: 'array',
          description: 'Name, bundle identifier, version, path, whether it is running and why it is protected.',
        },
      },
    },
    examples: [
      {
        description: 'See which applications can be removed',
        command: 'turink-toys apps.list --json',
      },
      {
        description: 'Include the applications that ship with macOS',
        command: 'turink-toys apps.list --all --json',
      },
    ],
    present(result, t) {
      return {
        rows: ((result && result.apps) || []).map((app) =>
          row(
            app.name,
            app.running ? `${app.version || ''} · ${t('result.running', 'running')}`.trim() : app.version || '',
            app.running ? 'warn' : null
          )
        ),
      };
    },

    async execute(run, input) {
      const apps = await listApps();
      const shown = input.all ? apps : apps.filter((app) => !app.protected);
      return {
        apps: shown.map(({ names, ...app }) => app),
        protectedCount: apps.filter((app) => app.protected).length,
      };
    },
  })
);
