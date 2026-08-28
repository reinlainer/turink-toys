'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { inspect, resolveNames } = require('./read');
const { row, formatBytes } = require('../../kernel/present');


// The reverse of the compression problem. An archive from Windows carries names
// in a legacy code page, and extracting it on macOS without accounting for that
// produces unreadable filenames on disk.

function openReadStream(zip, entry) {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => (err ? reject(err) : resolve(stream)));
  });
}

// Reported so a caller can tell whether the archive spread itself across the
// destination or arrived already contained in one folder. The destination is a
// folder of its own either way, so nothing has to be added around it.
function rootCount(names) {
  return new Set(names.map((n) => n.split('/')[0]).filter(Boolean)).size;
}

register(
  defineTask({
    id: 'archive.extract',
    title: 'Safe extract',
    summary: 'Extract a zip archive, recovering names written in a legacy code page',
    whenToUse:
      'Opening an archive received from Windows where filenames appear as unreadable characters, or extracting any archive from an untrusted source.',
    risk: 'create',
    cost: 'proportional',
    accepts: 'paths',
    idempotent: false,
    errors: ['SRC_NOT_FOUND', 'NOT_AN_ARCHIVE', 'ENCODING_AMBIGUOUS', 'PATH_ESCAPE', 'DEST_EXISTS'],
    input: {
      type: 'object',
      required: ['archive'],
      properties: {
        archive: {
          label: 'Archive',
          type: 'string',
          positional: true,
          description: 'Path to the zip archive to extract.',
        },
        output: {
          label: 'Extract to',
          type: 'string',
          description: 'Directory to extract into. Defaults to the archive name without .zip.',
        },
        encoding: {
          label: 'Filename encoding',
          type: 'string',
          description:
            'Code page for names that lack the UTF-8 flag, for example euc-kr or shift_jis.',
        },
        auto: {
          label: 'Choose encoding automatically',
          type: 'boolean',
          default: false,
          description: 'Accept the highest ranked encoding instead of stopping to ask.',
        },
        force: {
          label: 'Use existing folder',
          type: 'boolean',
          default: false,
          description: 'Write into an existing directory instead of choosing a free name.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        output: { type: 'string', description: 'Directory the entries were written to.' },
        files: { type: 'integer', description: 'Number of files written.' },
      },
    },
    examples: [
      {
        description: 'Extract and let the tool report encoding candidates',
        command: 'turink-toys archive.extract ~/Downloads/from-windows.zip --json',
      },
      {
        description: 'Extract a Korean Windows archive with the encoding named',
        command: 'turink-toys archive.extract archive.zip --encoding euc-kr',
      },
    ],
    present(result, t) {
      return {
        rows: [
          row(t('result.files', 'Files'), String(result.files)),
          row(t('result.folders', 'Folders'), String(result.directories)),
          row(t('result.encoding', 'Encoding'), result.encoding),
        ],
        paths: [result.output],
      };
    },

    async execute(run, input) {
      const { zip, entries, needsGuess, encodings } = await inspect(input.archive);

      let encoding = input.encoding;
      if (needsGuess.length > 0 && !encoding) {
        if (!input.auto) {
          zip.close();
          // Returning candidates instead of prompting keeps the task usable from
          // a script and from an agent, neither of which can answer a question.
          fail(
            'ENCODING_AMBIGUOUS',
            `${needsGuess.length} name(s) lack the UTF-8 flag, so the code page has to be chosen.`,
            {
              hint: `Re-run with --encoding ${encodings[0]?.encoding || 'euc-kr'}, or with --auto to accept the top candidate.`,
              retryable: true,
              details: { candidates: encodings },
            }
          );
        }
        encoding = encodings[0]?.encoding || 'utf-8';
        run.warn('ENCODING_ASSUMED', {
          encoding,
          confidence: encodings[0]?.confidence ?? null,
          alternatives: encodings.slice(1, 3).map((e) => e.encoding),
        });
      }

      const named = resolveNames(entries, encoding || 'utf-8');

      const escaping = named.filter((e) => e.escaping);
      if (escaping.length > 0) {
        zip.close();
        fail('PATH_ESCAPE', `${escaping.length} entry name(s) point outside the destination.`, {
          hint: 'This archive is unsafe to extract. Inspect it with "turink-toys archive.inspect".',
          details: { entries: escaping.slice(0, 5).map((e) => e.name) },
        });
      }

      const stem = path.basename(input.archive).replace(/\.zip$/i, '');
      let destination = path.resolve(input.output || path.join(path.dirname(path.resolve(input.archive)), stem));
      if (!input.force && fs.existsSync(destination)) {
        let picked = null;
        for (let n = 2; n < 1000; n += 1) {
          const next = `${destination}-${n}`;
          if (!fs.existsSync(next)) {
            picked = next;
            break;
          }
        }
        if (!picked) {
          zip.close();
          fail('DEST_EXISTS', `Cannot find a free directory name near "${destination}".`, {
            hint: 'Pass --output with an explicit directory.',
          });
        }
        destination = picked;
      }

      fs.mkdirSync(destination, { recursive: true });

      let files = 0;
      for (const entry of named) {
        const target = path.join(destination, entry.name);
        if (entry.isDirectory) {
          fs.mkdirSync(target, { recursive: true });
          continue;
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const stream = await openReadStream(zip, entry.raw);
        await pipeline(stream, fs.createWriteStream(target));
        files += 1;
        run.progress(files, named.length, entry.name, 'file');
      }
      zip.close();

      return {
        archive: input.archive,
        output: destination,
        files,
        directories: named.filter((e) => e.isDirectory).length,
        encoding: encoding || 'utf-8',
        topLevelEntries: rootCount(named.map((e) => e.name)),
      };
    },
  })
);
