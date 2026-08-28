'use strict';

const { fail } = require('./errors');

const tasks = new Map();

function register(task) {
  if (tasks.has(task.id)) throw new Error(`task "${task.id}" is already registered`);
  tasks.set(task.id, task);
  return task;
}

function get(id) {
  const task = tasks.get(id);
  if (!task) {
    const near = [...tasks.keys()].filter((k) => k.startsWith(id.split('.')[0] + '.'));
    fail('UNKNOWN_TASK', `There is no task named "${id}".`, {
      hint: near.length
        ? `Did you mean one of: ${near.join(', ')}?`
        : 'Run "turink-toys capabilities --brief" for the task list.',
    });
  }
  return task;
}

function all() {
  return [...tasks.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function has(id) {
  return tasks.has(id);
}

module.exports = { register, get, all, has };
