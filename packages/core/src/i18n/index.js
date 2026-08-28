'use strict';

const ko = require('./ko');

// Only text a person reads is translated. Error codes, JSON field names and the
// hints an agent parses stay in English in every locale, because they are a
// contract: a caller that branches on a code must not have to know which
// language the machine happens to be set to.
//
// English lives in the task manifests themselves rather than in a locale file,
// so a string with no translation falls back to real text instead of a key.

const LOCALES = { ko };
const DEFAULT_LOCALE = 'en';

function normalize(tag) {
  if (!tag) return DEFAULT_LOCALE;
  const base = String(tag).toLowerCase().split(/[-_.]/)[0];
  return LOCALES[base] ? base : DEFAULT_LOCALE;
}

// Precedence, highest first: an explicit choice on this invocation, the
// override variable, a setting the user saved, then the environment. A saved
// setting has to sit below the variable, otherwise the variable stops working
// the moment anyone picks a language in the window.
function detect({ explicit, saved, system } = {}) {
  if (explicit) return normalize(explicit);
  // A dedicated variable makes the language testable without changing the
  // machine's own settings.
  if (process.env.TURINK_TOYS_LANG) return normalize(process.env.TURINK_TOYS_LANG);
  if (saved) return normalize(saved);
  if (system) return normalize(system);
  return normalize(process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG);
}

// Task identifiers contain a dot, so a key cannot be split on every dot. At
// each step the longest matching property wins, which lets "task" hold entries
// named "archive.compress" without escaping anything.
function lookup(locale, key) {
  let node = LOCALES[locale];
  if (!node) return null;

  let rest = key;
  while (rest.length > 0) {
    if (typeof node !== 'object' || node === null) return null;

    const match = Object.keys(node)
      .filter((candidate) => rest === candidate || rest.startsWith(candidate + '.'))
      .sort((a, b) => b.length - a.length)[0];

    if (!match) return null;
    node = node[match];
    rest = rest.slice(match.length + 1);
  }
  return typeof node === 'string' ? node : null;
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name])
  );
}

// Returns the translation, or the supplied fallback, or the key itself. Passing
// the English string as the fallback keeps every call site readable and means a
// missing entry degrades to English rather than to a placeholder.
function t(locale, key, fallback, params) {
  const found = lookup(locale, key);
  const text = found ?? fallback ?? key;
  return interpolate(text, params);
}

// Task text is stored under the task id so a translator can see one task's
// strings together rather than hunting through a flat list.
function localizeTask(task, locale) {
  const base = `task.${task.id}`;
  const properties = {};

  for (const [name, rule] of Object.entries(task.input.properties || {})) {
    properties[name] = {
      ...rule,
      label: t(locale, `${base}.input.${name}.label`, rule.label || name),
      description: t(locale, `${base}.input.${name}.description`, rule.description),
    };
  }

  return {
    ...task,
    title: t(locale, `${base}.title`, task.title),
    summary: t(locale, `${base}.summary`, task.summary),
    whenToUse: t(locale, `${base}.whenToUse`, task.whenToUse),
    input: { ...task.input, properties },
  };
}

// An error reaching a person is rendered from its code and details so the
// sentence reads naturally in the target language. The English message travels
// alongside and is what any machine-readable output carries.
function localizeError(error, locale) {
  const message = t(locale, `error.${error.code}.message`, error.message, error.details);
  const hint = error.hint ? t(locale, `error.${error.code}.hint`, error.hint, error.details) : null;
  return { ...error, message, hint };
}

function available() {
  return [DEFAULT_LOCALE, ...Object.keys(LOCALES)];
}

module.exports = { t, detect, normalize, localizeTask, localizeError, available, DEFAULT_LOCALE };
