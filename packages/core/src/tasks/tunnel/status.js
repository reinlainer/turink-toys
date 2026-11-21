'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const service = require('./service');
const { presentTunnel } = require('./present');

const OUTPUT = {
  type: 'object',
  properties: {
    installed: { type: 'boolean', description: 'Whether the tunnel service is installed.' },
    enabled: { type: 'boolean', description: 'Whether the tunnel is switched on. When on, it connects by itself whenever the proxy can be reached.' },
    server: { type: 'string', description: 'Proxy IPv4 address.' },
    port: { type: 'integer', description: 'Proxy port.' },
    isDefault: { type: 'boolean', description: 'Whether the proxy is the DirectBridge default, 192.168.49.1:8282.' },
    state: {
      type: 'string',
      description: 'off, waiting (switched on but the proxy cannot be reached), on (all traffic goes through the proxy), problem (the proxy answered but no internet came through, so traffic went back to the normal route), stopped (the service is installed but silent) or not-installed.',
    },
    since: { type: 'string', description: 'When the current state began, or null.' },
  },
};

register(
  defineTask({
    id: 'tunnel.status',
    title: 'Proxy tunnel status',
    summary: 'Report whether all traffic is going through the SOCKS5 proxy',
    whenToUse:
      'Checking whether the proxy tunnel is installed and switched on, which proxy it uses and whether traffic is going through it right now. Reads state only.',
    risk: 'read',
    cost: 'instant',
    idempotent: true,
    errors: [],
    input: { type: 'object', properties: {} },
    output: OUTPUT,
    examples: [{ description: 'Read the current state', command: 'turink-toys tunnel.status --json' }],
    present: presentTunnel,

    async execute() {
      return service.readStatus();
    },
  })
);

module.exports = { OUTPUT };
