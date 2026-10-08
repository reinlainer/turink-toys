'use strict';

const { formatBytes } = require('@turink/core/src/kernel/format');

// Formats the neutral result structure the core produces. Nothing here knows
// which task ran, so a new task prints correctly without touching this file.

function renderResult(shown) {
  const lines = [];

  if (shown.rows.length > 0) {
    const width = Math.max(...shown.rows.map((r) => [...r.label].length));
    for (const entry of shown.rows) {
      const pad = ' '.repeat(Math.max(0, width - [...entry.label].length));
      lines.push(`  ${entry.label}${pad}   ${entry.value}`);
    }
  }

  if (shown.paths.length > 0) {
    if (lines.length > 0) lines.push('');
    for (const target of shown.paths) lines.push(`  ${target}`);
  }

  if (shown.notes.length > 0) {
    if (lines.length > 0) lines.push('');
    for (const note of shown.notes) lines.push(`  ${note}`);
  }

  return lines.join('\n');
}

function renderPlan(plan) {
  const lines = [`${plan.summary}`];
  for (const item of plan.items.slice(0, 10)) {
    const size = item.bytes ? `  (${formatBytes(item.bytes)})` : '';
    const basis = item.basis === 'name' ? '  [matched by name only]' : '';
    lines.push(`  ${item.path}${size}${basis}`);
  }
  if (plan.items.length > 10) lines.push(`  … ${plan.items.length - 10} more`);
  return lines.join('\n');
}

module.exports = { renderResult, renderPlan, formatBytes };
