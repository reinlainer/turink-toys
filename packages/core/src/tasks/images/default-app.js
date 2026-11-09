'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { row } = require('../../kernel/present');

const run = promisify(execFile);

// Which application opens a photo is a per-type setting kept by macOS. Reading
// and changing it is done by a small native helper, because changing it needs
// an application context to show the system's confirmation prompt.
const NATIVE = path.resolve(__dirname, '..', '..', '..', 'native');
const HELPER = require(path.join(NATIVE, 'helpers.json')).find((h) => h.executable === 'default-app');
const BINARY = path.join(NATIVE, 'build', `${HELPER.name}.app`, 'Contents', 'MacOS', HELPER.executable);

const OUR_APP = 'toys.turink.app';
const FALLBACK_APP = 'com.apple.Preview';

// The photo types Turink Toys can open, with the name a person knows each by.
const TYPES = [
  { uti: 'public.jpeg', name: 'JPEG' },
  { uti: 'public.png', name: 'PNG' },
  { uti: 'public.heic', name: 'HEIC' },
  { uti: 'public.heif', name: 'HEIF' },
  { uti: 'public.tiff', name: 'TIFF' },
  { uti: 'com.compuserve.gif', name: 'GIF' },
  { uti: 'org.webmproject.webp', name: 'WebP' },
  { uti: 'public.avif', name: 'AVIF' },
  { uti: 'com.microsoft.bmp', name: 'BMP' },
];
const UTIS = TYPES.map((type) => type.uti);

// The helper waits up to this long for the person to answer each type's
// prompt, so a whole run needs every type's wait plus a little slack.
const PROMPT_MS = 120 * 1000;
const SET_TIMEOUT_MS = TYPES.length * PROMPT_MS + 30 * 1000;
const GET_TIMEOUT_MS = 15 * 1000;

function nameOf(uti) {
  const known = TYPES.find((type) => type.uti === uti);
  return known ? known.name : uti;
}

async function helper(args, timeout) {
  try {
    const { stdout } = await run(BINARY, args, { timeout, maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (err) {
    // A missing executable is the one failure with a fix the person can make;
    // anything else is a real fault and is reported as it is.
    if (err.code === 'ENOENT') {
      fail('HELPER_MISSING', 'The default-app helper is not part of this build.', {
        hint: 'In a source checkout, run "npm run helpers" and try again. A release build always includes it.',
      });
    }
    throw err;
  }
}

function helperAvailable() {
  return fs.existsSync(BINARY);
}

// The current handler of every photo type, and whether it is the given app.
async function status(app = OUR_APP) {
  const handlers = await helper(['get', ...UTIS], GET_TIMEOUT_MS);
  const types = TYPES.map(({ uti, name }) => {
    const handler = handlers[uti] || null;
    return { uti, name, handler, ours: handler === app };
  });
  return { app, types, allOurs: types.every((type) => type.ours) };
}

// Asks the helper to make `app` the default for the given types and returns one
// result per type. macOS may show a prompt for each, and the helper waits.
async function setDefaults(app, utis) {
  if (utis.length === 0) return [];
  const outcome = await helper(['set', app, ...utis], SET_TIMEOUT_MS);
  return utis.map((uti) => {
    const item = outcome[uti] || { result: 'error', message: 'The helper gave no answer for this type.' };
    return { uti, name: nameOf(uti), result: item.result, ...(item.message ? { message: item.message } : {}) };
  });
}

function summarize(results) {
  return {
    applied: results.filter((item) => item.result === 'applied').length,
    kept: results.filter((item) => item.result === 'kept').length,
    failed: results.filter((item) => item.result === 'error').length,
  };
}

register(
  defineTask({
    id: 'images.default-app',
    title: 'Photo default app',
    summary: 'Show which application opens each photo type by default',
    whenToUse:
      'Finding out whether Turink Toys is the default application for photo types (JPEG, PNG, HEIC, HEIF, TIFF, GIF, WebP, AVIF, BMP), or which application is, before images.set-default-app changes it. Reads the system setting only.',
    risk: 'read',
    cost: 'cheap',
    idempotent: true,
    errors: ['HELPER_MISSING'],
    input: {
      type: 'object',
      properties: {
        app: {
          label: 'Application',
          type: 'string',
          default: OUR_APP,
          description: 'The bundle identifier to compare against. Defaults to Turink Toys.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'The bundle identifier compared against.' },
        types: { type: 'array', description: 'Each type as { uti, name, handler, ours }. handler is the bundle identifier that opens it now, or null; ours says whether that is app.' },
        allOurs: { type: 'boolean', description: 'Whether app opens every one of the types.' },
      },
    },
    examples: [{ description: 'See who opens photos', command: 'turink-toys images.default-app --json' }],
    present(result, t) {
      const types = (result && result.types) || [];
      return {
        rows: [
          row(
            t('result.defaultTypes', 'Opened by Turink Toys'),
            `${types.filter((type) => type.ours).length}/${types.length}`,
            result && result.allOurs ? 'good' : undefined
          ),
        ],
      };
    },
    async execute(run, input) {
      return status(input.app || OUR_APP);
    },
  })
);

module.exports = { OUR_APP, FALLBACK_APP, TYPES, UTIS, BINARY, helperAvailable, status, setDefaults, summarize };
