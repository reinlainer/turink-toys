'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const pmset = require('./pmset');
const { row } = require('../../kernel/present');

register(
  defineTask({
    id: 'power.status',
    title: 'Power status',
    summary: 'Report the current sleep and lid settings',
    whenToUse:
      'Checking whether sleep is currently suppressed and when it will return, before changing anything. Reads settings only.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        lidSleepDisabled: { type: 'boolean', description: 'Whether closing the lid still sleeps.' },
        keepAwake: { type: 'object', description: 'Active idle-sleep suppression, if any.' },
      },
    },
    examples: [
      { description: 'Read the current state', command: 'turink-toys power.status --json' },
    ],
    present(result, t) {
      const keepAwake = (result && result.keepAwake) || { active: false };
      return {
        rows: [
          row(
            t('result.lidCloses', 'Closing the lid'),
            result.lidSleepDisabled
              ? t('result.lidStaysAwake', 'Stays awake')
              : t('result.lidSleeps', 'Sleeps'),
            result.lidSleepDisabled ? 'warn' : null
          ),
          result.lidRestoreScheduled
            ? row(t('result.restoreScheduled', 'Automatic restore'), t('result.scheduled', 'Scheduled'))
            : null,
          row(t('result.displaySleep', 'Display sleeps after'), `${result.displaySleepMinutes} min`),
          row(
            t('result.idleSleep', 'Idle sleep'),
            keepAwake.active
              ? t('result.suppressedFor', 'Suppressed, {minutes} min left', {
                  minutes: keepAwake.minutesLeft,
                })
              : t('result.normal', 'Normal'),
            keepAwake.active ? 'warn' : null
          ),
        ].filter(Boolean),
      };
    },

    async execute() {
      const settings = await pmset.readSettings();
      const keepAwake = pmset.readKeepAwake();

      return {
        lidSleepDisabled: settings.lidSleepDisabled,
        lidRestoreScheduled: pmset.restoreScheduled(),
        displaySleepMinutes: settings.displaySleepMinutes,
        systemSleepMinutes: settings.systemSleepMinutes,
        keepAwake: keepAwake
          ? {
              active: true,
              pid: keepAwake.pid,
              expiresAt: keepAwake.expiresAt,
              minutesLeft: Math.max(
                0,
                Math.round((new Date(keepAwake.expiresAt).getTime() - Date.now()) / 60000)
              ),
            }
          : { active: false },
      };
    },
  })
);
