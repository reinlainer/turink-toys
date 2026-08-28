'use strict';

// Arguments are parsed against the task manifest rather than a hand-written
// table, so a task gains its flags the moment it declares them. Positional
// arguments fill the property the manifest marks as positional.

const OUTPUT_FLAGS = new Set(['json', 'stream', 'dry-run', 'yes']);

function parse(argv, task) {
  const props = task ? task.input.properties || {} : {};
  const positionalName = Object.keys(props).find((name) => props[name].positional);
  const positionalIsList = positionalName ? props[positionalName].type === 'array' : false;

  const input = {};
  const options = { json: false, stream: false, dryRun: false, confirm: null, yes: false };
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const [rawName, inlineValue] = splitFlag(arg.slice(2));

      if (rawName === 'confirm') {
        options.confirm = inlineValue ?? argv[++i];
        continue;
      }
      if (rawName === 'lang') {
        options.lang = inlineValue ?? argv[++i];
        continue;
      }
      if (OUTPUT_FLAGS.has(rawName)) {
        if (rawName === 'json') options.json = true;
        else if (rawName === 'stream') options.stream = true;
        else if (rawName === 'dry-run') options.dryRun = true;
        else if (rawName === 'yes') options.yes = true;
        continue;
      }

      const name = camel(rawName);
      const rule = props[name];

      if (rule && rule.type === 'boolean') {
        input[name] = inlineValue === undefined ? true : inlineValue !== 'false';
        continue;
      }

      const value = inlineValue ?? argv[++i];
      if (rule && rule.type === 'array') {
        input[name] = String(value ?? '').split(',').filter(Boolean);
      } else {
        input[name] = value;
      }
      continue;
    }

    positionals.push(arg);
  }

  if (positionalName && positionals.length > 0) {
    input[positionalName] = positionalIsList ? positionals : positionals[0];
  }

  return { input, options, positionals };
}

function splitFlag(text) {
  const eq = text.indexOf('=');
  if (eq === -1) return [text, undefined];
  return [text.slice(0, eq), text.slice(eq + 1)];
}

function camel(text) {
  return text.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

module.exports = { parse };
