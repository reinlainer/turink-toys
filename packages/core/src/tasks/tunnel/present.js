'use strict';

const { row } = require('../../kernel/present');

// Every tunnel task returns the shape of tunnel.status, so they are shown alike.

const TONE = { on: 'good', problem: 'warn', stopped: 'warn' };

function stateText(state, t) {
  switch (state) {
    case 'on':
      return t('result.tunnelOn', 'Connected through the proxy');
    case 'waiting':
      return t('result.tunnelWaiting', 'Waiting for the proxy');
    case 'problem':
      return t('result.tunnelProblem', 'No internet through the proxy');
    case 'stopped':
      return t('result.tunnelStopped', 'Service not running');
    case 'not-installed':
      return t('result.tunnelNotInstalled', 'Not installed');
    default:
      return t('result.tunnelOff', 'Off');
  }
}

function presentTunnel(result, t) {
  if (!result) return { rows: [], notes: [] };
  return {
    rows: [
      row(t('result.tunnelState', 'Proxy tunnel'), stateText(result.state, t), TONE[result.state] || null),
      result.installed ? row(t('result.tunnelTarget', 'Proxy'), `${result.server}:${result.port}`) : null,
    ].filter(Boolean),
    notes: [
      result.state === 'stopped'
        ? t('result.tunnelStoppedNote', 'The service is installed but has stopped reporting. Remove the proxy tunnel and install it again.')
        : null,
    ].filter(Boolean),
  };
}

module.exports = { presentTunnel };
