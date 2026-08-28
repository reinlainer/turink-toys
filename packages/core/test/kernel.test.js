'use strict';

const test = require('node:test');
const assert = require('node:assert');

require('../src/index');
const registry = require('../src/kernel/registry');
const plan = require('../src/kernel/plan');
const { runTask } = require('../src/kernel/execute');
const { EXIT, TaskError } = require('../src/kernel/errors');

test('every registered task declares what an agent needs to choose it', () => {
  for (const task of registry.all()) {
    assert.ok(task.whenToUse, `${task.id} needs whenToUse`);
    assert.ok(task.summary, `${task.id} needs a summary`);
    assert.ok(task.input, `${task.id} needs an input schema`);
    for (const [name, rule] of Object.entries(task.input.properties || {})) {
      assert.ok(rule.description, `${task.id}.${name} needs a description`);
    }
  }
});

test('every documented example names a task that exists', () => {
  for (const task of registry.all()) {
    for (const example of task.examples) {
      assert.ok(example.command.includes(task.id), `${task.id} example should call the task`);
      assert.ok(example.description, `${task.id} example needs a description`);
    }
  }
});

test('destructive tasks compute a plan before acting', () => {
  for (const task of registry.all()) {
    if (task.risk === 'destroy') {
      assert.ok(task.plan, `${task.id} is destructive and must declare a plan`);
    }
  }
});

test('plan hashing ignores object key order', () => {
  const a = plan.withHash({ items: [{ path: '/x', bytes: 1 }] });
  const b = plan.withHash({ items: [{ bytes: 1, path: '/x' }] });
  assert.equal(a.hash, b.hash);
});

test('a different plan produces a different hash', () => {
  const a = plan.withHash({ items: [{ path: '/x', bytes: 1 }] });
  const b = plan.withHash({ items: [{ path: '/x', bytes: 2 }] });
  assert.notEqual(a.hash, b.hash);
});

test('an unknown argument is refused with the accepted list', async () => {
  await assert.rejects(
    () => runTask('disk.targets', { nonexistent: true }),
    (err) => {
      assert.ok(err instanceof TaskError);
      assert.equal(err.exitCode, EXIT.USAGE);
      assert.ok(err.hint, 'the caller needs to know what is accepted');
      return true;
    }
  );
});

test('an unknown task suggests what exists', async () => {
  await assert.rejects(
    () => runTask('disk.nonsense', {}),
    (err) => {
      assert.equal(err.code, 'UNKNOWN_TASK');
      assert.ok(err.hint.includes('disk.'));
      return true;
    }
  );
});

test('clearing a toolchain asks for acknowledgement instead of refusing', async () => {
  await assert.rejects(
    () => runTask('disk.clean', { targets: ['android.sdk'] }),
    (err) => {
      assert.equal(err.code, 'NEEDS_ACKNOWLEDGEMENT');
      assert.ok(err.hint.includes('--include-toolchains'), 'the caller needs the way forward');
      assert.ok(
        err.details.toolchains[0].consequence,
        'the consequence is what the user decides on'
      );
      return true;
    }
  );
});

test('a toolchain proceeds to the plan once acknowledged', async () => {
  // Reaching the confirmation gate proves the acknowledgement gate opened.
  await assert.rejects(
    () => runTask('disk.clean', { targets: ['android.sdk'], includeToolchains: true }),
    (err) => {
      assert.equal(err.code, 'NEEDS_CONFIRM');
      return true;
    }
  );
});

test('every documented exit code is reachable from some error', () => {
  const { CODES, EXIT } = require('../src/kernel/errors');
  const reachable = new Set(Object.values(CODES));
  for (const code of [EXIT.USAGE, EXIT.NEEDS_CONFIRM, EXIT.NEEDS_PRIVILEGE, EXIT.PLAN_MISMATCH, EXIT.LOCKED]) {
    assert.ok(reachable.has(code), `no error maps to exit ${code}`);
  }
});

test('a field naming an option source points at a task that exists', () => {
  for (const task of registry.all()) {
    for (const [name, rule] of Object.entries(task.input.properties || {})) {
      if (!rule.optionsFrom || !rule.optionsFrom.task) continue;
      assert.ok(
        registry.has(rule.optionsFrom.task),
        `${task.id}.${name} names a missing task "${rule.optionsFrom.task}"`
      );
    }
  }
});

test('every task can present its own output', () => {
  const { present } = require('../src/kernel/present');
  for (const task of registry.all()) {
    // A present function must survive a result it did not expect rather than
    // throwing into the window.
    const shown = present(task, {}, (key, fallback) => fallback);
    assert.ok(Array.isArray(shown.rows), `${task.id} returned no rows array`);
  }
});

test('the language override outranks a saved setting', () => {
  const i18n = require('../src/i18n');
  const previous = process.env.TURINK_TOYS_LANG;
  process.env.TURINK_TOYS_LANG = 'en';
  try {
    // Documented precedence: a saved choice must not disable the variable.
    assert.equal(i18n.detect({ saved: 'ko' }), 'en');
    assert.equal(i18n.detect({ explicit: 'ko', saved: 'en' }), 'ko');
  } finally {
    if (previous === undefined) delete process.env.TURINK_TOYS_LANG;
    else process.env.TURINK_TOYS_LANG = previous;
  }
});

test('a saved setting outranks the system language', () => {
  const i18n = require('../src/i18n');
  const previous = process.env.TURINK_TOYS_LANG;
  delete process.env.TURINK_TOYS_LANG;
  try {
    assert.equal(i18n.detect({ saved: 'ko', system: 'en-US' }), 'ko');
  } finally {
    if (previous !== undefined) process.env.TURINK_TOYS_LANG = previous;
  }
});

test('journal pruning is wired to something that calls it', () => {
  const journal = require('../src/kernel/journal');
  assert.equal(typeof journal.pruneIfDue, 'function');
  // A retention policy nothing invokes is the same as no retention policy, so
  // the run that opens a journal is what triggers the sweep.
  const source = require('fs').readFileSync(require.resolve('../src/kernel/run.js'), 'utf8');
  assert.ok(source.includes('pruneIfDue'), 'no run path triggers pruning');
});
