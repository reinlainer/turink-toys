'use strict';

const { fail } = require('./errors');

// A task manifest is the single description of one capability. The CLI parser,
// the usage output, the GUI form and the generated reference all read from it,
// so a field added here reaches every surface without further edits.

const RISK = ['read', 'create', 'mutate', 'destroy'];
const COST = ['instant', 'cheap', 'proportional', 'expensive'];

const REQUIRED = ['id', 'title', 'summary', 'whenToUse', 'risk', 'cost', 'input', 'execute'];

// Every input property needs a label a person can read and a description
// explaining it. Enforcing that here means a new task cannot ship a form field
// showing a bare property name.
function assertInputText(spec) {
  for (const [name, rule] of Object.entries(spec.input.properties || {})) {
    if (!rule.description) {
      throw new Error(`task "${spec.id}" input "${name}" is missing a description`);
    }
    if (!rule.label) {
      throw new Error(`task "${spec.id}" input "${name}" is missing a label`);
    }
    if (rule.optionsFrom && !rule.optionsFrom.task && !rule.optionsFrom.runs) {
      throw new Error(`task "${spec.id}" input "${name}" declares optionsFrom with no source`);
    }
  }
}

function defineTask(spec) {
  for (const field of REQUIRED) {
    if (spec[field] === undefined) {
      throw new Error(`task manifest "${spec.id || '?'}" is missing "${field}"`);
    }
  }
  if (!RISK.includes(spec.risk)) {
    throw new Error(`task "${spec.id}" has an unknown risk "${spec.risk}"`);
  }
  if (!COST.includes(spec.cost)) {
    throw new Error(`task "${spec.id}" has an unknown cost "${spec.cost}"`);
  }
  if (!/^[a-z]+\.[a-z-]+$/.test(spec.id)) {
    throw new Error(`task id "${spec.id}" must read as "<domain>.<verb>"`);
  }
  assertInputText(spec);

  return {
    id: spec.id,
    domain: spec.id.split('.')[0],
    title: spec.title,
    summary: spec.summary,
    whenToUse: spec.whenToUse,
    risk: spec.risk,
    cost: spec.cost,
    accepts: spec.accepts || null,
    idempotent: spec.idempotent === true,
    input: spec.input,
    output: spec.output || null,
    errors: spec.errors || [],
    examples: spec.examples || [],
    plan: spec.plan || null,
    execute: spec.execute,
    present: spec.present || null,
  };
}

// Destructive work always passes through a plan the caller confirms. Tasks that
// only read or create declare no plan and run directly.
function requiresConfirmation(task) {
  return task.risk === 'destroy';
}

function requiresLock(task) {
  return task.risk === 'mutate' || task.risk === 'destroy';
}

// Validation covers the subset of JSON Schema the manifests use. A dependency
// would buy little here and the error text has to name the offending field
// precisely enough for an agent to correct its own call.
function validateInput(task, input) {
  const schema = task.input;
  const props = schema.properties || {};
  const required = schema.required || [];
  const out = {};

  for (const name of required) {
    if (input[name] === undefined || input[name] === null) {
      fail('MISSING_INPUT', `"${name}" is required by ${task.id}.`, {
        hint: `Run "turink-toys help ${task.id}" for the full argument list.`,
      });
    }
  }

  for (const [name, value] of Object.entries(input)) {
    const rule = props[name];
    if (!rule) {
      const known = Object.keys(props).join(', ');
      fail('INVALID_INPUT', `${task.id} has no argument "${name}".`, {
        hint: `Accepted arguments: ${known}.`,
      });
    }
    out[name] = coerce(task, name, rule, value);
  }

  for (const [name, rule] of Object.entries(props)) {
    if (out[name] === undefined && rule.default !== undefined) {
      out[name] = rule.default;
    }
  }

  return out;
}

function coerce(task, name, rule, value) {
  if (rule.type === 'array') {
    const list = Array.isArray(value) ? value : [value];
    if (rule.minItems && list.length < rule.minItems) {
      fail('INVALID_INPUT', `"${name}" needs at least ${rule.minItems} item(s).`, {
        hint: `Run "turink-toys help ${task.id}" for an example.`,
      });
    }
    return list;
  }
  if (rule.type === 'boolean') {
    return value === true || value === 'true' || value === '';
  }
  if (rule.type === 'integer' || rule.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      fail('INVALID_INPUT', `"${name}" must be a number, received "${value}".`, {
        hint: `Run "turink-toys help ${task.id}" for the accepted range.`,
      });
    }
    if (rule.minimum !== undefined && n < rule.minimum) {
      fail('INVALID_INPUT', `"${name}" must be at least ${rule.minimum}.`);
    }
    if (rule.maximum !== undefined && n > rule.maximum) {
      fail('INVALID_INPUT', `"${name}" must be at most ${rule.maximum}.`);
    }
    return n;
  }
  if (rule.enum && !rule.enum.includes(value)) {
    fail('INVALID_INPUT', `"${name}" must be one of: ${rule.enum.join(', ')}.`, {
      hint: `Received "${value}".`,
    });
  }
  return value;
}

module.exports = { defineTask, validateInput, requiresConfirmation, requiresLock, RISK, COST };
