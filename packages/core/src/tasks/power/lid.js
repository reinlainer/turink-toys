'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { requireRoot } = require('../../kernel/privilege');
const pmset = require('./pmset');
const { row } = require('../../kernel/present');

const DEFAULT_RESTORE_MINUTES = 120;

// Leaving sleep suppressed and then closing the laptop into a bag lets it run
// hot with no airflow. The timed restore is therefore part of enabling the
// setting rather than an option, and it is scheduled during the same
// authenticated moment so it cannot be skipped.

register(
  defineTask({
    id: 'power.lid',
    title: 'Lid close behaviour',
    summary: 'Choose whether closing the lid puts the machine to sleep',
    whenToUse:
      'Keeping a long job running with the lid closed, typically on an external display. Requires administrator rights, so an agent cannot complete it alone.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    errors: ['NEEDS_PRIVILEGE', 'LOCKED'],
    input: {
      type: 'object',
      properties: {
        sleep: {
          label: 'When the lid closes',
          type: 'string',
          enum: ['on', 'off'],
          default: 'on',
          description: 'Set to off to keep running while the lid is closed.',
        },
        minutes: {
          label: 'Restore after',
          type: 'integer',
          minimum: 5,
          maximum: 720,
          default: DEFAULT_RESTORE_MINUTES,
          description: 'How long before sleep is restored automatically.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        lidSleepDisabled: { type: 'boolean', description: 'State after the change.' },
        restoreAt: { type: 'string', description: 'When sleep returns automatically.' },
      },
    },
    examples: [
      {
        description: 'Keep running with the lid closed for three hours',
        command: 'sudo turink-toys power.lid --sleep off --minutes 180',
      },
      {
        description: 'Restore normal behaviour now',
        command: 'sudo turink-toys power.lid --sleep on',
      },
    ],
    present(result, t) {
      return {
        rows: [
          row(
            t('result.lidCloses', 'Closing the lid'),
            result.lidSleepDisabled
              ? t('result.lidStaysAwake', 'Stays awake')
              : t('result.lidSleeps', 'Sleeps'),
            result.lidSleepDisabled ? 'warn' : 'good'
          ),
          result.restoreAt
            ? row(t('result.restoresAt', 'Sleep returns at'), new Date(result.restoreAt).toLocaleString())
            : null,
        ].filter(Boolean),
        notes: [result && result.warning],
      };
    },

    async execute(run, input) {
      const disable = input.sleep === 'off';
      requireRoot('power', disable ? 'Suppressing lid sleep' : 'Restoring lid sleep');

      const before = await pmset.readSettings();
      if (before.lidSleepDisabled === disable) {
        run.info('The setting already holds the requested value.');
      }

      const applied = await pmset.setLidSleepDisabled(disable);
      if (!applied) {
        // disablesleep is undocumented, so a silent no-op is a real possibility
        // and has to surface rather than be reported as success.
        fail('FAILED', 'pmset accepted the change but the setting did not take effect.', {
          hint: 'Check "pmset -g" for SleepDisabled. This setting is undocumented and may have changed in this macOS release.',
        });
      }

      let restoreAt = null;
      if (disable) {
        restoreAt = new Date(Date.now() + input.minutes * 60000).toISOString();
        await pmset.scheduleRestore(restoreAt);
        run.info(`Sleep returns automatically at ${restoreAt}`);
      } else {
        await pmset.cancelRestore();
      }

      return {
        lidSleepDisabled: disable,
        restoreAt,
        restoreScheduled: pmset.restoreScheduled(),
        warning: disable
          ? 'The machine now stays awake with the lid closed. Do not put it in a bag before sleep is restored.'
          : null,
      };
    },
  })
);
