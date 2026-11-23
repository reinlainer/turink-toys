'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const service = require('./service');
const { presentTunnel } = require('./present');
const { OUTPUT } = require('./status');

register(
  defineTask({
    id: 'tunnel.enable',
    title: 'Switch proxy tunnel',
    summary: 'Turn the proxy tunnel on or off',
    whenToUse:
      'Sending all of the Mac\'s traffic, terminal tools included, through the SOCKS5 proxy, or stopping that. When on, the tunnel connects by itself whenever the proxy can be reached and falls back to the normal route when it cannot. Needs the tunnel installed once (tunnel.install). Takes effect within a few seconds.',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    errors: ['TUNNEL_NOT_INSTALLED'],
    input: {
      type: 'object',
      properties: {
        off: { label: 'Turn off', type: 'boolean', default: false, description: 'Turn the tunnel off and keep the normal route.' },
      },
    },
    output: OUTPUT,
    examples: [
      { description: 'Turn the tunnel on', command: 'turink-toys tunnel.enable' },
      { description: 'Turn it off', command: 'turink-toys tunnel.enable --off' },
    ],
    present: presentTunnel,

    async execute(run, input) {
      service.writeConfig({ enabled: !input.off });
      run.info(input.off ? 'Proxy tunnel switched off.' : 'Proxy tunnel switched on.');
      const active = (status) => ['on', 'waiting', 'problem'].includes(status.state);
      return service.awaitStatus((status) => (input.off ? !active(status) : status.state !== 'off'));
    },
  })
);
