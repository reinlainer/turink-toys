#!/usr/bin/env node
'use strict';

const core = require('@turink/core');
const { parse } = require('./args');
const { renderResult, renderPlan } = require('./render');

const { registry, execute, usage, journal, errors, i18n, settings, present } = core;
const { EXIT, TaskError, CODES } = errors;

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    return handleHelp(rest, command);
  }
  if (command === '--version' || command === '-v') {
    return handleVersion();
  }
  if (command === 'capabilities') {
    return handleCapabilities(rest);
  }
  if (command === 'agent-snippet') {
    process.stdout.write(usage.agentSnippet(registry.all()) + '\n');
    return EXIT.OK;
  }
  if (command === 'runs') {
    return handleRuns(rest);
  }

  return handleTask(command, rest);
}

function handleHelp(rest, command) {
  if (command === 'help' && rest[0]) {
    const task = registry.get(rest[0]);
    process.stdout.write(usage.taskHelp(task, CODES) + '\n');
    return EXIT.OK;
  }
  process.stdout.write(usage.overview(registry.all()) + '\n');
  return EXIT.OK;
}

function handleVersion() {
  const pkg = require('../package.json');
  // Reporting the resolved path alongside the version is what makes a stale
  // link in PATH diagnosable rather than merely confusing.
  process.stdout.write(`turink-toys ${pkg.version}\n${process.argv[1]}\n`);
  return EXIT.OK;
}

function handleCapabilities(rest) {
  const brief = rest.includes('--brief');
  const tasks = registry.all();
  const payload = brief ? usage.brief(tasks) : usage.full(tasks);
  process.stdout.write(JSON.stringify({ version: 1, tasks: payload }) + '\n');
  return EXIT.OK;
}

function handleRuns(rest) {
  const [action, id] = rest;
  const json = rest.includes('--json');

  if (!action || action === 'list') {
    const runs = journal.list({ activeOnly: rest.includes('--active') });
    if (json) {
      process.stdout.write(JSON.stringify({ runs }) + '\n');
    } else if (runs.length === 0) {
      process.stdout.write('No runs recorded.\n');
    } else {
      for (const run of runs) {
        process.stdout.write(`${run.run}  ${String(run.status).padEnd(13)}  ${run.task}  (${run.source})\n`);
      }
    }
    return EXIT.OK;
  }

  if (action === 'show') {
    const events = journal.read(id);
    if (!events) {
      process.stderr.write(`No run recorded under "${id}".\n`);
      return EXIT.FAILED;
    }
    for (const event of events) process.stdout.write(JSON.stringify(event) + '\n');
    return EXIT.OK;
  }

  process.stderr.write(`Unknown runs action "${action}". Use list, show or tail.\n`);
  return EXIT.USAGE;
}

async function handleTask(taskId, argv) {
  // Output flags do not depend on the task, so they are read before it is
  // resolved. Naming an unknown task has to fail the same structured way as
  // any other error, and it cannot do that if the lookup throws first.
  const pre = parse(argv, null);

  // Machine-readable output is never translated. A caller that branches on a
  // code must not depend on the language the terminal happens to be set to.
  const locale = i18n.detect({ explicit: pre.options.lang, saved: settings.get('locale') });

  let task;
  let input;
  let options = pre.options;
  try {
    task = registry.get(taskId);
    ({ input, options } = parse(argv, task));
  } catch (err) {
    return reportFailure(err, { ...pre.options, locale });
  }

  const out = (text) => process.stdout.write(text + '\n');
  const note = (text) => process.stderr.write(text + '\n');

  try {
    const outcome = await execute.runTask(taskId, input, {
      source: 'cli',
      confirm: options.confirm,
      dryRun: options.dryRun,
      // Announcing the identifier before the work starts is what allows a
      // caller to follow a long run with "turink-toys runs tail".
      onStart: (runId) => note(`run ${runId}`),
      onEvent: options.stream ? (event) => out(JSON.stringify(event)) : null,
    });

    if (options.json) {
      out(JSON.stringify({ run: outcome.runId, status: outcome.status, result: outcome.result }));
    } else if (!options.stream) {
      if (outcome.result?.dryRun) {
        out(renderPlan(outcome.result.plan));
      } else {
        const shown = present.present(task, outcome.result, (key, fallback, params) =>
          i18n.t(locale, key, fallback, params)
        );
        out(renderResult(shown));
      }
      for (const warning of outcome.warnings.slice(0, 5)) {
        note(`warning ${warning.code}: ${warning.path || warning.entries || ''}`);
      }
    }
    return outcome.status === 'partial' ? EXIT.PARTIAL : EXIT.OK;
  } catch (err) {
    return reportFailure(err, { ...options, locale });
  }
}

function reportFailure(err, options) {
  const isTaskError = err instanceof TaskError;
  const payload = isTaskError
    ? err.toJSON()
    : { code: 'FAILED', message: err.message, retryable: false };
  const exit = isTaskError ? err.exitCode : EXIT.FAILED;

  if (options.json || options.stream) {
    const body = { status: err.code === 'NEEDS_CONFIRM' ? 'needs_confirm' : 'error', error: payload };
    if (err.payload?.plan) body.plan = err.payload.plan;
    if (err.runId) body.run = err.runId;
    process.stdout.write(JSON.stringify(body) + '\n');
  } else {
    const shown = i18n.localizeError(payload, options.locale || 'en');
    process.stderr.write(`${payload.code}: ${shown.message}\n`);
    if (shown.hint) process.stderr.write(`  ${shown.hint}\n`);
    if (err.payload?.plan) process.stderr.write(renderPlan(err.payload.plan) + '\n');
  }
  return exit;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code ?? EXIT.OK;
  })
  .catch((err) => {
    process.stderr.write(`FAILED: ${err.message}\n`);
    process.exitCode = EXIT.FAILED;
  });
