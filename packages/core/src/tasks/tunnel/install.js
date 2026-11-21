'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { requireRoot } = require('../../kernel/privilege');
const { fail } = require('../../kernel/errors');
const service = require('./service');
const { presentTunnel } = require('./present');
const { OUTPUT } = require('./status');

register(
  defineTask({
    id: 'tunnel.install',
    title: 'Install proxy tunnel',
    summary: 'Install the service that routes all traffic through the SOCKS5 proxy',
    whenToUse:
      'Setting the proxy tunnel up once. Downloads tun2socks from its official release, checks it against the published checksum and registers a background service, then switches the tunnel on. Requires administrator rights, so an agent cannot complete it alone.',
    risk: 'mutate',
    cost: 'cheap',
    idempotent: true,
    errors: ['NEEDS_PRIVILEGE', 'FAILED'],
    input: {
      type: 'object',
      properties: {
        owner: {
          label: 'Owner',
          type: 'integer',
          minimum: 1,
          description: 'User id whose settings file the tunnel follows. Defaults to the user who ran sudo.',
        },
      },
    },
    output: OUTPUT,
    examples: [{ description: 'Install once', command: 'sudo turink-toys tunnel.install' }],
    present: presentTunnel,

    async execute(run, input) {
      requireRoot('tunnel', 'Installing the proxy tunnel');
      const owner = input.owner || Number(process.env.SUDO_UID);
      if (!Number.isInteger(owner) || owner < 1) {
        fail('INVALID_INPUT', 'The owner of the tunnel settings is unknown.', {
          hint: 'Run it with sudo from your own account, or pass --owner with your user id (id -u).',
        });
      }
      const { fetched } = await service.install(owner);
      run.info(fetched ? 'tun2socks downloaded and verified.' : 'tun2socks already present.');
      run.info('Proxy tunnel installed and switched on.');
      return service.readStatus();
    },
  })
);
