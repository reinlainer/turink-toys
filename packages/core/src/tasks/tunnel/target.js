'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const service = require('./service');
const { presentTunnel } = require('./present');
const { OUTPUT } = require('./status');

register(
  defineTask({
    id: 'tunnel.target',
    title: 'Proxy tunnel server',
    summary: 'Set the SOCKS5 proxy the tunnel uses',
    whenToUse:
      'Pointing the tunnel at a SOCKS5 proxy other than the DirectBridge default (192.168.49.1:8282), or going back to it with --default. The proxy must accept UDP so DNS lookups can pass. Needs the tunnel installed once (tunnel.install).',
    risk: 'mutate',
    cost: 'instant',
    idempotent: true,
    errors: ['TUNNEL_NOT_INSTALLED', 'INVALID_INPUT'],
    input: {
      type: 'object',
      properties: {
        server: { label: 'Server', type: 'string', description: 'Proxy IPv4 address, for example 192.168.49.1.' },
        port: { label: 'Port', type: 'integer', minimum: 1, maximum: 65535, description: 'Proxy port.' },
        default: { label: 'Use DirectBridge default', type: 'boolean', default: false, description: 'Go back to 192.168.49.1:8282.' },
      },
    },
    output: OUTPUT,
    examples: [
      { description: 'Use a local SOCKS5 proxy', command: 'turink-toys tunnel.target --server 127.0.0.1 --port 1086' },
      { description: 'Go back to DirectBridge', command: 'turink-toys tunnel.target --default' },
    ],
    present: presentTunnel,

    async execute(run, input) {
      const changes = input.default
        ? { ...service.DEFAULTS }
        : { server: input.server ?? service.readConfig().server, port: input.port ?? service.readConfig().port };
      const saved = service.writeConfig(changes);
      run.info(`Proxy set to ${saved.server}:${saved.port}.`);
      return service.readStatus();
    },
  })
);
