'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const pmset = require('./pmset');
const { row } = require('../../kernel/present');

// macOS does not sleep the system while the display is on, so a sleep timer
// at or below the display timer means the Mac sleeps when the display turns
// off. Zero means it never sleeps on its own.
function autoSleep(result, t) {
  const sleep = result.systemSleepMinutes;
  const display = result.displaySleepMinutes;
  if (!sleep) return t('result.never', 'Never');
  if (display && sleep <= display) return t('result.autoSleepWithDisplay', 'When the display turns off');
  return t('result.autoSleepAfter', 'After {minutes} min idle', { minutes: sleep });
}

register(
  defineTask({
    id: 'power.status',
    title: 'Power status',
    summary: 'Report the current sleep and lid settings',
    whenToUse:
      'Checking whether sleep is currently suppressed and when it will return, before changing anything. The idle and display timers are those of the power source in use. Reads settings only.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: {
      type: 'object',
      properties: {
        lidSleepDisabled: { type: 'boolean', description: 'Whether closing the lid still sleeps.' },
        powerSource: { type: 'string', description: 'Power source in use: ac or battery. The sleep and display values belong to it.' },
        lidRestoreAt: { type: 'string', description: 'When lid sleep returns automatically, if scheduled.' },
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
          result.lidRestoreAt
            ? row(t('result.restoresAt', 'Sleep returns at'), new Date(result.lidRestoreAt).toLocaleString())
            : null,
          result.powerSource
            ? row(
                t('result.powerSource', 'Power source'),
                result.powerSource === 'ac'
                  ? t('result.sourceAdapter', 'Power adapter')
                  : t('result.sourceBattery', 'Battery')
              )
            : null,
          row(t('result.autoSleep', 'Sleeps when idle'), autoSleep(result, t)),
          row(
            t('result.displaySleep', 'Display turns off after'),
            result.displaySleepMinutes
              ? t('result.minutes', '{minutes} min', { minutes: result.displaySleepMinutes })
              : t('result.never', 'Never')
          ),
          row(
            t('result.idleSleep', 'Stay awake'),
            keepAwake.active
              ? t('result.suppressedFor', 'On, {minutes} min left', {
                  minutes: keepAwake.minutesLeft,
                })
              : t('result.normal', 'Off'),
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
        lidRestoreAt: pmset.scheduledRestore(),
        powerSource: settings.powerSource,
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
