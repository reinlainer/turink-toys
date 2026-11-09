'use strict';

const { row } = require('../../kernel/present');

// mouse.status and mouse.reverse return the same shape, so both are shown the
// same way.

function helperText(helper, t) {
  switch (helper) {
    case 'active':
      return t('result.helperActive', 'Running');
    case 'needs-permission':
      return t('result.helperNeedsPermission', 'Needs Accessibility permission');
    case 'starting':
      return t('result.helperStarting', 'Starting');
    case 'stopped':
      return t('result.helperStopped', 'Not running');
    default:
      return t('result.helperOff', 'Off');
  }
}

const TONE = { active: 'good', 'needs-permission': 'warn', stopped: 'warn' };

function presentWheel(result, t) {
  const reversing = Boolean(result && result.reversing);
  const helper = (result && result.helper) || 'off';
  return {
    rows: [
      row(
        t('result.wheelDirection', 'Mouse wheel'),
        reversing ? t('result.wheelReversed', 'Reversed') : t('result.wheelSystem', 'Follows System Settings')
      ),
      row(t('result.scrollHelper', 'Scroll helper'), helperText(helper, t), TONE[helper] || null),
    ],
    notes: [
      helper === 'needs-permission'
        ? t(
            'result.wheelPermissionNote',
            'Turn on Turink-Toys Scroll Reverser in System Settings > Privacy & Security > Accessibility. If it is already on, remove it from the list and turn reversal on again.'
          )
        : null,
      helper === 'stopped'
        ? t('result.wheelStoppedNote', 'The helper is registered but not running. Turn reversal off and on again.')
        : null,
    ].filter(Boolean),
  };
}

module.exports = { presentWheel };
