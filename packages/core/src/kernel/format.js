'use strict';

// Value formatting shared by every layer. Three copies of this drifted apart
// once already, which is why it lives on its own rather than beside its first
// caller.

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes === 0) return '0 B';
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}

module.exports = { formatBytes };
