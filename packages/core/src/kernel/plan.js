'use strict';

const crypto = require('crypto');

// A plan states what a run would touch. Destructive tasks compute one, hand its
// hash to the caller and refuse to proceed until the caller returns that hash.
// If the filesystem moved in between, the recomputed hash differs and the run
// stops rather than acting on a stale picture.

function hashPlan(plan) {
  const canonical = JSON.stringify(plan.items ?? plan, replacer);
  return 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

// Object key order must not change the hash, otherwise an identical plan built
// by a different code path would be rejected.
function replacer(key, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = value[k];
        return acc;
      }, {});
  }
  return value;
}

function withHash(plan) {
  return { ...plan, hash: hashPlan(plan) };
}

function matches(plan, confirmToken) {
  return typeof confirmToken === 'string' && confirmToken === plan.hash;
}

module.exports = { hashPlan, withHash, matches };
