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
require('./tasks/apps/list');
require('./tasks/apps/uninstall');
require('./tasks/apps/restore');
require('./tasks/folders/list');
require('./tasks/folders/add');
require('./tasks/folders/remove');
require('./tasks/folders/reorder');
require('./tasks/folders/rename');
require('./tasks/folders/open');
require('./tasks/folders/group-tasks');
require('./tasks/images/list');
require('./tasks/images/selected');
require('./tasks/images/select');
require('./tasks/images/copy');
require('./tasks/images/move');
require('./tasks/images/trash');
require('./tasks/images/restore');
require('./tasks/mouse/status');
require('./tasks/mouse/reverse');

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
  // The viewer decides what to draw from the same table the tasks use.
  images: require('./tasks/images/formats'),
};
