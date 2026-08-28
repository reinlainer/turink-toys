'use strict';

// Loading the task modules registers them. Front ends require this file and
// then read the registry, so adding a task means adding one require below.
require('./tasks/archive/compress');
require('./tasks/archive/extract');
require('./tasks/archive/inspect');
require('./tasks/archive/verify');
require('./tasks/disk/targets');
require('./tasks/disk/report');
require('./tasks/disk/clean');
require('./tasks/disk/restore');
require('./tasks/power/status');
require('./tasks/power/lid');
require('./tasks/power/keep-awake');

module.exports = {
  registry: require('./kernel/registry'),
  execute: require('./kernel/execute'),
  usage: require('./kernel/usage'),
  journal: require('./kernel/journal'),
  errors: require('./kernel/errors'),
  i18n: require('./i18n'),
  settings: require('./kernel/settings'),
  present: require('./kernel/present'),
  format: require('./kernel/format'),
  paths: require('./kernel/paths'),
};
