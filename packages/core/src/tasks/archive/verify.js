'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { inspect, resolveNames } = require('./read');
const { sanitizePath } = require('./names');
const { row, formatBytes } = require('../../kernel/present');


// Answers one question: will this archive open cleanly on Windows? The checks
// mirror what archive.compress guarantees, so a verdict of "ready" means the
// archive matches what this tool would have produced.

register(
  defineTask({
    id: 'archive.verify',
    title: 'Verify Windows compatibility',
    summary: 'Check whether an existing archive will extract cleanly on Windows',
    whenToUse:
      'Confirming an archive is safe to send to a Windows recipient, or auditing archives produced by another tool. Changes nothing on disk.',
    risk: 'read',
    cost: 'cheap',
    accepts: 'paths',
    idempotent: true,
    errors: ['SRC_NOT_FOUND', 'NOT_AN_ARCHIVE'],
    input: {
      type: 'object',
      required: ['archive'],
      properties: {
        archive: {
          label: 'Archive',
          type: 'string',
          positional: true,
          description: 'Path to the zip archive to check.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', description: 'True when no problem was found.' },
        problems: { type: 'array', description: 'One entry per class of problem found.' },
      },
    },
    examples: [
      {
        description: 'Check an archive before sending it',
        command: 'turink-toys archive.verify ~/Desktop/bundle.zip --json',
      },
    ],
    present(result, t) {
      return {
        rows: [
          row(
            t('result.verdict', 'Verdict'),
            result.ready
              ? t('result.readyYes', 'Extracts cleanly on Windows')
              : t('result.readyNo', 'Will not extract cleanly'),
            result.ready ? 'good' : 'warn'
          ),
          row(t('result.entries', 'Entries'), String(result.entries)),
        ],
        notes: [
          ...((result && result.problems) || []).map((p) => `${p.code}: ${p.detail}`),
          result && result.remedy,
        ],
      };
    },

    async execute(run, input) {
      const { zip, entries, nonAscii, needsGuess } = await inspect(input.archive);
      const named = resolveNames(entries, 'utf-8');
      zip.close();

      const problems = [];

      if (needsGuess.length > 0) {
        problems.push({
          code: 'MISSING_UTF8_FLAG',
          entries: needsGuess.length,
          detail: 'Non-ASCII names lack the UTF-8 flag and will decode with the system code page.',
        });
      }

      const decomposed = named.filter((e) => e.name !== e.name.normalize('NFC'));
      if (decomposed.length > 0) {
        problems.push({
          code: 'DECOMPOSED_NAMES',
          entries: decomposed.length,
          detail: 'Names are stored in NFD and appear with separated marks on Windows.',
        });
      }

      const illegal = named.filter((e) => sanitizePath(e.name).changes.length > 0);
      if (illegal.length > 0) {
        problems.push({
          code: 'WIN_ILLEGAL_CHAR',
          entries: illegal.length,
          detail: 'Names contain characters or reserved words Windows cannot create.',
          examples: illegal.slice(0, 5).map((e) => e.name),
        });
      }

      const escaping = named.filter((e) => e.escaping);
      if (escaping.length > 0) {
        problems.push({
          code: 'PATH_ESCAPE',
          entries: escaping.length,
          detail: 'Entries point outside the extraction directory.',
        });
      }

      for (const problem of problems) run.warn(problem.code, { entries: problem.entries });

      return {
        archive: input.archive,
        ready: problems.length === 0,
        entries: entries.length,
        nonAsciiNames: nonAscii.length,
        problems,
        remedy:
          problems.length === 0
            ? null
            : 'Re-create the archive with "turink-toys archive.compress" to correct every item above.',
      };
    },
  })
);
