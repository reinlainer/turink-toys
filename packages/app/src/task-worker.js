'use strict';

// Runs one task off the main process. Several tasks walk large directory trees
// with synchronous file calls; on the main process that freezes every window
// until the walk ends. A worker thread keeps the window responsive while the
// core does exactly what it does for the command line.

const { parentPort, workerData } = require('worker_threads');
const { execute, errors } = require('@turink/core');

(async () => {
  const { taskId, input, options } = workerData;
  try {
    const outcome = await execute.runTask(taskId, input, {
      ...options,
      onStart: (runId) => parentPort.postMessage({ type: 'start', runId }),
      onEvent: (record) => parentPort.postMessage({ type: 'event', record }),
    });
    parentPort.postMessage({ type: 'done', outcome });
  } catch (err) {
    parentPort.postMessage({
      type: 'error',
      error:
        err instanceof errors.TaskError
          ? err.toJSON()
          : { code: 'FAILED', message: err.message, retryable: false },
      payload: err.payload || null,
      runId: err.runId || null,
    });
  }
})();
