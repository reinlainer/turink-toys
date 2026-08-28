'use strict';

const { Run } = require('./run');
const lock = require('./lock');
const plan = require('./plan');
const registry = require('./registry');
const { validateInput, requiresConfirmation, requiresLock } = require('./manifest');
const { TaskError, fail } = require('./errors');

// One path serves every front end. A GUI button, a Finder quick action, a
// terminal command and an agent all arrive here, so a safety gate cannot be
// bypassed by choosing a different surface.

async function runTask(taskId, rawInput, options = {}) {
  const task = registry.get(taskId);
  const input = validateInput(task, rawInput);

  const run = new Run({
    taskId: task.id,
    source: options.source || 'cli',
    onEvent: options.onEvent || null,
    ephemeral: options.ephemeral === true && task.risk === 'read',
  });

  // The caller needs the identifier before the work finishes so it can follow a
  // long run. Announcing it here makes "turink-toys runs tail" usable from the start.
  if (options.onStart) options.onStart(run.id);
  run.start(input);

  let release = null;
  try {
    if (requiresLock(task)) {
      release = lock.acquire(task.domain, run.id);
    }

    let computed = null;
    if (task.plan) {
      computed = plan.withHash(await task.plan(run, input));
      run.emit('plan', { summary: computed.summary, hash: computed.hash, items: computed.items?.length ?? 0 });

      if (requiresConfirmation(task)) {
        const token = options.confirm;
        if (!token) {
          const payload = { status: 'needs_confirm', plan: publicPlan(computed) };
          const err = new TaskError('NEEDS_CONFIRM', confirmMessage(computed), {
            hint: `Re-run the same command with --confirm ${computed.hash}`,
            retryable: true,
          });
          await run.end('needs_confirm', { plan: publicPlan(computed), error: err.toJSON() });
          throw Object.assign(err, { runId: run.id, payload });
        }
        if (!plan.matches(computed, token)) {
          fail('PLAN_MISMATCH', 'The confirmed plan no longer matches what is on disk.', {
            hint: `Re-run without --confirm to obtain the current plan hash (now ${computed.hash}).`,
            retryable: true,
          });
        }
      }

      if (options.dryRun) {
        const result = { dryRun: true, plan: publicPlan(computed) };
        await run.end('ok', { result });
        return { runId: run.id, status: 'ok', result, warnings: run.warnings };
      }
    }

    const result = await task.execute(run, input, computed);
    const status = run.warnings.length > 0 && result?.partial ? 'partial' : 'ok';
    await run.end(status, { result });
    return { runId: run.id, status, result, warnings: run.warnings };
  } catch (err) {
    if (err.code !== 'NEEDS_CONFIRM') {
      const payload = err instanceof TaskError ? err.toJSON() : { code: 'FAILED', message: err.message, retryable: false };
      await run.end('error', { error: payload });
      err.runId = run.id;
    }
    throw err;
  } finally {
    if (release) release();
  }
}

function publicPlan(computed) {
  return {
    hash: computed.hash,
    summary: computed.summary,
    items: computed.items ?? [],
    bytes: computed.bytes ?? null,
  };
}

function confirmMessage(computed) {
  const count = computed.items ? computed.items.length : 0;
  return `${computed.summary || `${count} item(s)`}. Confirmation is required before this runs.`;
}

module.exports = { runTask };
