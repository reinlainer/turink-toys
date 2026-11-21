'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { requireRoot } = require('../../kernel/privilege');
const service = require('./service');
const { presentTunnel } = require('./present');
const { OUTPUT } = require('./status');

register(
  defineTask({
    id: 'tunnel.uninstall',
    title: 'Remove proxy tunnel',
    summary: 'Remove the proxy tunnel service and put the network back as it was',
    whenToUse:
      'No longer using the proxy tunnel. Stops the service, which restores the routes and DNS first, then deletes the service, tun2socks and the settings. Requires administrator rights, so an agent cannot complete it alone.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    errors: ['NEEDS_PRIVILEGE'],
    input: { type: 'object', properties: {} },
    output: OUTPUT,
    examples: [{ description: 'Remove it', command: 'sudo turink-toys tunnel.uninstall' }],
    present: presentTunnel,

    async execute(run) {
      requireRoot('tunnel', 'Removing the proxy tunnel');
      await service.uninstall();
      run.info('Proxy tunnel removed.');
      return service.readStatus();
    },
  })
);
