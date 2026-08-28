'use strict';

const { formatBytes } = require('./format');

// Turns a task result into something a person can read, once, in a form both
// front ends render. Without this the command line and the window each carry
// their own idea of what a result looks like, and they drift.
//
// A task returns { rows, paths, notes }. Rows are label and value pairs, paths
// are files the run produced, notes are sentences that need no label.

function rows(...entries) {
  return entries.filter((entry) => entry && entry.value !== undefined && entry.value !== null);
}

function row(label, value, tone) {
  return { label, value, tone: tone || null };
}

// A task with nothing declared still shows its result rather than an empty
// card, which is what makes a missing present function a cosmetic gap instead
// of a blank screen.
function fallback(result) {
  if (!result || typeof result !== 'object') return { rows: [], paths: [], notes: [] };
  const out = [];
  for (const [key, value] of Object.entries(result)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue;
    out.push(row(key, String(value)));
  }
  return { rows: out, paths: [], notes: [] };
}

function present(task, result, t) {
  if (!task.present) return fallback(result);
  let shown;
  try {
    shown = task.present(result, t) || {};
  } catch {
    // A presentation defect must not swallow the result itself, so the plain
    // rendering stands in rather than an error reaching the window.
    return fallback(result);
  }
  return {
    rows: shown.rows || [],
    paths: shown.paths || [],
    notes: (shown.notes || []).filter(Boolean),
  };
}

module.exports = { present, rows, row, formatBytes, fallback };
