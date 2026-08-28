'use strict';

// Every failure surfaces a stable code, a message for the person reading it and
// a hint that tells an agent what to do next. Agents build their retry from the
// hint, so a hint must name a concrete next command whenever one exists.

const EXIT = {
  OK: 0,
  FAILED: 1,
  USAGE: 2,
  NEEDS_CONFIRM: 3,
  NEEDS_PRIVILEGE: 4,
  PLAN_MISMATCH: 5,
  PARTIAL: 6,
  LOCKED: 7,
};

const CODES = {
  // Usage and input
  UNKNOWN_TASK: EXIT.USAGE,
  INVALID_INPUT: EXIT.USAGE,
  MISSING_INPUT: EXIT.USAGE,

  // Targets
  SRC_NOT_FOUND: EXIT.FAILED,
  DEST_EXISTS: EXIT.FAILED,
  NOT_AN_ARCHIVE: EXIT.FAILED,
  UNKNOWN_TARGET: EXIT.USAGE,
  NEEDS_ACKNOWLEDGEMENT: EXIT.NEEDS_CONFIRM,

  // Safety gates
  NEEDS_CONFIRM: EXIT.NEEDS_CONFIRM,
  PLAN_MISMATCH: EXIT.PLAN_MISMATCH,
  NEEDS_PRIVILEGE: EXIT.NEEDS_PRIVILEGE,
  OUTSIDE_HOME: EXIT.FAILED,
  PATH_ESCAPE: EXIT.FAILED,
  LOCKED: EXIT.LOCKED,

  // Encoding
  ENCODING_AMBIGUOUS: EXIT.FAILED,

  // Partial completion
  PARTIAL: EXIT.PARTIAL,
};

class TaskError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'TaskError';
    this.code = code;
    this.hint = options.hint || null;
    this.retryable = options.retryable === true;
    this.details = options.details || null;
  }

  get exitCode() {
    return CODES[this.code] ?? EXIT.FAILED;
  }

  toJSON() {
    const out = { code: this.code, message: this.message };
    if (this.hint) out.hint = this.hint;
    out.retryable = this.retryable;
    if (this.details) out.details = this.details;
    return out;
  }
}

function fail(code, message, options) {
  throw new TaskError(code, message, options);
}

module.exports = { EXIT, CODES, TaskError, fail };
