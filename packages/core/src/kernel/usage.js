'use strict';

// Usage text is produced from the manifests at run time. A published binary
// carries no companion documentation, so what the executable prints is the
// only reference an agent has, and it cannot drift from the behaviour.

function overview(tasks) {
  const lines = [];
  lines.push('turink-toys — macOS utilities for people and AI agents');
  lines.push('');
  lines.push('USAGE');
  lines.push('  turink-toys <domain>.<verb> [targets...] [options]');
  lines.push('');
  lines.push('DISCOVERY');
  lines.push('  turink-toys capabilities --brief    Task list with purpose and cost');
  lines.push('  turink-toys capabilities --json     Full manifests and input schemas');
  lines.push('  turink-toys help <task>             Arguments, examples and error codes');
  lines.push('  turink-toys agent-snippet           Paragraph to paste into an agent instruction file');
  lines.push('');
  lines.push('TASKS');
  const width = Math.max(...tasks.map((t) => t.id.length));
  for (const task of tasks) {
    lines.push(`  ${task.id.padEnd(width)}  ${task.summary}`);
  }
  lines.push('');
  lines.push('RUNS');
  lines.push('  turink-toys runs list [--active]    Recent runs, including ones the app started');
  lines.push('  turink-toys runs show <run-id>      Full event stream of one run');
  lines.push('  turink-toys runs tail <run-id>      Follow a run that is still going');
  lines.push('');
  lines.push('OUTPUT');
  lines.push('  (default)                      Formatted text');
  lines.push('  --json                         Final result object on one line');
  lines.push('  --stream                       Every event as NDJSON');
  lines.push('');
  lines.push('Start with "turink-toys capabilities --brief" to choose a task.');
  return lines.join('\n');
}

function brief(tasks) {
  return tasks.map((task) => ({
    id: task.id,
    summary: task.summary,
    whenToUse: task.whenToUse,
    risk: task.risk,
    cost: task.cost,
    idempotent: task.idempotent,
  }));
}

function full(tasks) {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    summary: task.summary,
    whenToUse: task.whenToUse,
    risk: task.risk,
    cost: task.cost,
    accepts: task.accepts,
    idempotent: task.idempotent,
    input: task.input,
    output: task.output,
    errors: task.errors,
    examples: task.examples,
  }));
}

function taskHelp(task, errorCatalog) {
  const lines = [];
  lines.push(`${task.id} — ${task.title}`);
  lines.push('');
  lines.push(task.summary);
  lines.push('');
  lines.push(`WHEN TO USE`);
  lines.push(`  ${task.whenToUse}`);
  lines.push('');
  lines.push('PROPERTIES');
  lines.push(`  risk        ${task.risk}${task.risk === 'destroy' ? ' (requires --confirm)' : ''}`);
  lines.push(`  cost        ${task.cost}`);
  lines.push(`  idempotent  ${task.idempotent ? 'yes' : 'no'}`);
  lines.push('');

  const props = task.input.properties || {};
  const required = new Set(task.input.required || []);
  if (Object.keys(props).length > 0) {
    lines.push('ARGUMENTS');
    for (const [name, rule] of Object.entries(props)) {
      const flag = rule.positional ? `<${name}...>` : `--${name}`;
      const type = rule.type === 'boolean' ? '' : ` <${rule.type}>`;
      const mark = required.has(name) ? ' (required)' : '';
      lines.push(`  ${flag}${type}${mark}`);
      lines.push(`      ${rule.description}`);
      if (rule.enum) lines.push(`      one of: ${rule.enum.join(', ')}`);
      if (rule.default !== undefined) lines.push(`      default: ${JSON.stringify(rule.default)}`);
    }
    lines.push('');
  }

  if (task.examples.length > 0) {
    lines.push('EXAMPLES');
    for (const example of task.examples) {
      lines.push(`  ${example.description}`);
      lines.push(`    $ ${example.command}`);
      lines.push('');
    }
  }

  if (task.errors.length > 0) {
    lines.push('ERRORS');
    for (const code of task.errors) {
      const exit = errorCatalog[code];
      lines.push(`  ${code}${exit !== undefined ? `  (exit ${exit})` : ''}`);
    }
    lines.push('');
  }

  lines.push('Add --json for a single result object, or --stream for the event stream.');
  return lines.join('\n');
}

function agentSnippet(tasks) {
  return [
    '## turink-toys',
    '',
    '`turink-toys` is a local command line tool for macOS housekeeping: creating and',
    'extracting archives that survive a round trip to Windows, reporting and',
    'clearing developer cache directories, and controlling sleep behaviour.',
    '',
    'It is built for agent use. Every task accepts `--json` and returns a single',
    'result object. Failures carry a stable `code` and a `hint` naming the next',
    'command to run. Destructive tasks refuse to act until a plan hash is passed',
    'back with `--confirm`.',
    '',
    'Run `turink-toys capabilities --brief` to see the available tasks, then',
    '`turink-toys help <task>` for the arguments of the one you need.',
  ].join('\n');
}

module.exports = { overview, brief, full, taskHelp, agentSnippet };
