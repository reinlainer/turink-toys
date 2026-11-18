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
      'Before calling apps.uninstall, to learn the exact name, bundle identifier and path it accepts, whether the application is running, and which cloud storage folders it still has connected (cloudStorage), since apps.uninstall refuses both until the app is quit or the account disconnected. Reads application metadata only, not their contents.',
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
          description: 'Name, bundle identifier, version, path, whether it is running, why it is protected and the cloud storage folders connected through it.',
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
        rows: ((result && result.apps) || []).map((app) => {
          const states = [
            app.running ? t('result.running', 'running') : null,
            (app.cloudStorage || []).length > 0 ? t('result.cloudConnected', 'cloud account connected') : null,
          ].filter(Boolean);
          return row(app.name, [app.version, ...states].filter(Boolean).join(' · '), states.length > 0 ? 'warn' : null);
        }),
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
