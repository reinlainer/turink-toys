'use strict';

const fs = require('fs');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { assertUnderHome } = require('../../kernel/paths');
const { moveToTrash } = require('../../kernel/trash');
const catalog = require('./catalog');
const { scan, formatBytes } = require('./scan');
const { resolveTargets } = require('./report');
const { row } = require('../../kernel/present');

// Deleting goes to the Trash rather than removing outright, which is what makes
// disk.restore possible. The move goes through Finder, which reports the name
// the item ends up with in the Trash; because the Trash sits on the same volume
// the move is a rename and stays fast regardless of size.

async function removePermanently(target) {
  await fs.promises.rm(target, { recursive: true, force: true });
}

register(
  defineTask({
    id: 'disk.clean',
    title: 'Clear caches',
    summary: 'Move developer caches and unused toolchains to the Trash',
    whenToUse:
      'Reclaiming disk space after disk.report has shown what is large. Caches go straight through; toolchains need --include-toolchains because restoring one means downloading it again.',
    risk: 'destroy',
    cost: 'proportional',
    idempotent: false,
    errors: [
      'UNKNOWN_TARGET',
      'NEEDS_ACKNOWLEDGEMENT',
      'NEEDS_CONFIRM',
      'PLAN_MISMATCH',
      'OUTSIDE_HOME',
      'NEEDS_PRIVILEGE',
      'LOCKED',
      'PARTIAL',
    ],
    input: {
      type: 'object',
      required: ['targets'],
      properties: {
        targets: {
          label: 'Targets',
          type: 'array',
          description: 'Which locations to clear.',
          // Naming where the values come from lets a front end offer the real
          // choices instead of asking someone to recall a slug. The referenced
          // task is read-only and instant, so resolving it costs nothing.
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
        includeToolchains: {
          label: 'Include toolchains',
          type: 'boolean',
          default: false,
          description:
            'Allow targets that have to be reinstalled rather than rebuilt, such as an SDK or simulator devices.',
        },
        permanent: {
          label: 'Delete permanently',
          type: 'boolean',
          default: false,
          description: 'Delete outright instead of moving to the Trash. Cannot be undone.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        freedBytes: { type: 'integer', description: 'Space reclaimed.' },
        trashed: { type: 'array', description: 'Paths moved, with their original locations.' },
      },
    },
    examples: [
      {
        description: 'Ask what clearing DerivedData would remove',
        command: 'turink-toys disk.clean --targets xcode.deriveddata --json',
      },
      {
        description: 'Confirm the plan returned by the previous call',
        command: 'turink-toys disk.clean --targets xcode.deriveddata --confirm sha256:… --json',
      },
      {
        description: 'Remove simulator devices, which have to be recreated afterwards',
        command: 'turink-toys disk.clean --targets xcode.simulators --include-toolchains --json',
      },
    ],

    // The plan states exactly what execute will touch. Its hash is what the
    // caller confirms, so a directory that grew or vanished in between changes
    // the hash and stops the run instead of acting on a stale picture.
    async plan(run, input) {
      const selected = resolveTargets(input.targets);

      // Whether a toolchain is worth its disk space depends on how often its
      // owner is used, which only the user knows. The gate therefore states the
      // consequence and asks for an explicit opt-in rather than refusing.
      const toolchains = selected.filter((t) => t.kind === catalog.TOOLCHAIN);
      if (toolchains.length > 0 && !input.includeToolchains) {
        fail(
          'NEEDS_ACKNOWLEDGEMENT',
          `${toolchains.length} target(s) have to be reinstalled rather than rebuilt.`,
          {
            hint: 'Add --include-toolchains to proceed, having read the consequences below.',
            retryable: true,
            details: {
              toolchains: toolchains.map((t) => ({
                slug: t.slug,
                name: t.name,
                consequence: t.consequence,
              })),
            },
          }
        );
      }

      // Selecting a parent alongside its children would count the same bytes
      // twice and delete the children before the parent reaches them.
      const parents = selected.filter((t) => Array.isArray(t.contains));
      const covered = new Set(parents.flatMap((t) => t.contains));
      const effective = selected.filter((t) => !covered.has(t.slug));
      for (const parent of parents) {
        const dropped = selected.filter((t) => covered.has(t.slug)).map((t) => t.slug);
        if (dropped.length > 0) {
          run.info(`${parent.slug} already covers ${dropped.join(', ')}`);
        }
      }

      const { results } = scan(effective, run, { useCache: false });
      const items = [];
      for (const result of results) {
        for (const target of result.paths) {
          assertUnderHome(target);
          items.push({ slug: result.slug, path: target, bytes: result.bytes });
        }
      }

      const bytes = items.reduce((sum, i) => sum + i.bytes, 0);
      const reinstall = effective.filter((t) => t.kind === catalog.TOOLCHAIN);
      return {
        items,
        bytes,
        summary: `${items.length} path(s), ${formatBytes(bytes)}`,
        consequences: reinstall.map((t) => ({ slug: t.slug, consequence: t.consequence })),
      };
    },

    present(result, t) {
      return {
        rows: [
          row(t('result.reclaimed', 'Reclaimed'), result.freedReadable, 'good'),
          row(t('result.removed', 'Locations removed'), String(((result && result.trashed) || []).length)),
          ((result && result.failed) || []).length > 0
            ? row(t('result.failed', 'Failed'), String(result.failed.length), 'warn')
            : null,
        ].filter(Boolean),
        notes: [
          result && result.restorable
            ? t('result.restorable', 'Moved to the Trash and can be restored.')
            : null,
        ],
      };
    },

    async execute(run, input, plan) {
      const trashed = [];
      const failed = [];
      let freed = 0;

      for (const [index, item] of plan.items.entries()) {
        run.progress(index + 1, plan.items.length, item.path, 'path');
        let outcome;
        if (input.permanent) {
          try {
            await removePermanently(item.path);
            outcome = { ok: true, trashName: null };
          } catch (err) {
            outcome = { ok: false, reason: err.message };
          }
        } else {
          outcome = await moveToTrash(item.path);
        }

        if (outcome.ok) {
          // The Trash renames on collision, and a target cleared twice leaves
          // two items of the same name there. Recording the name Finder reported
          // is what lets disk.restore pick the item from this run.
          trashed.push({
            slug: item.slug,
            from: item.path,
            trashName: outcome.trashName,
            bytes: item.bytes,
            permanent: input.permanent === true,
          });
          freed += item.bytes;
        } else {
          failed.push({ path: item.path, reason: outcome.reason });
          run.warn('REMOVE_FAILED', { path: item.path, reason: outcome.reason });
        }
      }

      return {
        freedBytes: freed,
        freedReadable: formatBytes(freed),
        trashed,
        failed,
        permanent: input.permanent === true,
        partial: failed.length > 0,
        restorable: !input.permanent && trashed.length > 0,
      };
    },
  })
);
