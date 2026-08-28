'use strict';

const crypto = require('crypto');
const journal = require('./journal');

const PROTOCOL_VERSION = 1;

// Run identifiers sort lexicographically by start time so listing the journal
// directory yields newest-first order without reading any file.
function newRunId() {
  const stamp = Date.now().toString(36).padStart(9, '0');
  const rand = crypto.randomBytes(5).toString('hex');
  return `${stamp}${rand}`;
}

// Window chrome polls read-only state to keep a menu current. Journalling every
// one of those would bury the runs a person actually cares about, and a task
// that changes nothing leaves nothing to audit.
const NO_JOURNAL = { write() {}, close: async () => {} };

class Run {
  constructor({ taskId, source = 'cli', onEvent = null, ephemeral = false }) {
    this.id = newRunId();
    this.taskId = taskId;
    this.source = source;
    this.seq = 0;
    this.onEvent = onEvent;
    this.ephemeral = ephemeral;
    this.warnings = [];
    this.log = ephemeral ? NO_JOURNAL : journal.open(this.id);
    if (!ephemeral) journal.pruneIfDue();
  }

  emit(event, payload = {}) {
    const record = {
      v: PROTOCOL_VERSION,
      run: this.id,
      seq: this.seq++,
      ts: new Date().toISOString(),
      event,
      ...payload,
    };
    this.log.write(record);
    if (this.onEvent) this.onEvent(record);
    return record;
  }

  start(input) {
    return this.emit('run.start', { task: this.taskId, source: this.source, input });
  }

  progress(done, total, label, unit = 'item') {
    return this.emit('progress', { done, total, unit, label });
  }

  warn(code, payload = {}) {
    this.warnings.push({ code, ...payload });
    return this.emit('warn', { code, ...payload });
  }

  info(message) {
    return this.emit('log', { level: 'info', msg: message });
  }

  async end(status, payload = {}) {
    const record = this.emit('run.end', { status, ...payload });
    await this.log.close();
    return record;
  }
}

module.exports = { Run, PROTOCOL_VERSION, newRunId };
