'use strict';

const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { inspect, resolveNames } = require('./read');
const { row, formatBytes } = require('../../kernel/present');


register(
  defineTask({
    id: 'archive.inspect',
    title: 'Inspect archive',
    summary: 'Report the contents, encoding and flags of a zip archive',
    whenToUse:
      'Diagnosing why an archive shows unreadable names, or checking what an archive holds before extracting it. Changes nothing on disk.',
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
          description: 'Path to the zip archive to examine.',
        },
        items: {
          label: 'Full entry list',
          type: 'boolean',
          default: false,
          description: 'Include the full entry list instead of the first few names.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        entries: { type: 'integer', description: 'Number of entries in the archive.' },
        utf8Flagged: { type: 'integer', description: 'Entries carrying the UTF-8 name flag.' },
        encodings: { type: 'array', description: 'Candidate encodings ranked by confidence.' },
      },
    },
    examples: [
      {
        description: 'Find out why names look wrong',
        command: 'turink-toys archive.inspect ~/Downloads/from-windows.zip --json',
      },
    ],
    present(result, t) {
      const encodings = (result && result.encodings) || [];
      const names = (result && result.names) || [];
      return {
        rows: [
          row(t('result.entries', 'Entries'), String(result.entries)),
          row(t('result.size', 'Size'), formatBytes(result.bytes)),
          row(t('result.nonAscii', 'Non-ASCII names'), String(result.nonAsciiNames)),
          row(
            t('result.utf8Flagged', 'Carrying the UTF-8 flag'),
            `${result.utf8Flagged} / ${result.entries}`,
            result.needsEncodingGuess > 0 ? 'warn' : null
          ),
          encodings.length > 0
            ? row(t('result.encoding', 'Encoding'), `${result.assumedEncoding} (${encodings[0].label})`)
            : null,
        ].filter(Boolean),
        notes: names.slice(0, 6),
      };
    },

    async execute(run, input) {
      const { zip, entries, nonAscii, flagged, needsGuess, encodings } = await inspect(input.archive);
      const chosen = encodings.length > 0 ? encodings[0].encoding : 'utf-8';
      const named = resolveNames(entries, chosen);
      zip.close();

      const totalBytes = entries.reduce((sum, e) => sum + (e.size || 0), 0);
      const escaping = named.filter((e) => e.escaping).map((e) => e.name);

      const result = {
        archive: input.archive,
        entries: entries.length,
        directories: named.filter((e) => e.isDirectory).length,
        bytes: totalBytes,
        nonAsciiNames: nonAscii.length,
        utf8Flagged: flagged.length,
        needsEncodingGuess: needsGuess.length,
        encodings,
        assumedEncoding: chosen,
        unsafeEntries: escaping,
        names: input.items ? named.map((e) => e.name) : named.slice(0, 10).map((e) => e.name),
      };

      if (needsGuess.length > 0) {
        run.warn('MISSING_UTF8_FLAG', {
          entries: needsGuess.length,
          hint: `Extract with --encoding ${chosen} to restore the original names.`,
        });
      }
      if (escaping.length > 0) {
        run.warn('PATH_ESCAPE', { entries: escaping.length });
      }

      return result;
    },
  })
);
