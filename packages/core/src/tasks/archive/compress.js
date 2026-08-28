'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const yazl = require('yazl');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { fail } = require('../../kernel/errors');
const { sanitizePath } = require('./names');
const { row, formatBytes } = require('../../kernel/present');


// macOS writes zip archives without the UTF-8 flag, so Windows Explorer decodes
// non-ASCII names with the system code page and shows unreadable text. macOS
// also stores names in NFD while Windows expects NFC. Both are corrected here.

const SKIP_ALWAYS = new Set(['.DS_Store', '__MACOSX']);
const WINDOWS_METADATA = new Set(['Thumbs.db', 'desktop.ini']);

function walk(root, base, options, out) {
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  let hadChild = false;

  for (const entry of entries) {
    if (SKIP_ALWAYS.has(entry.name)) continue;
    if (options.excludeWindowsMetadata && WINDOWS_METADATA.has(entry.name)) continue;

    const full = path.join(root, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');

    if (entry.isSymbolicLink()) {
      if (options.symlinks === 'skip') continue;
      if (options.symlinks === 'store') {
        out.push({ kind: 'symlink', full, rel, target: fs.readlinkSync(full) });
        hadChild = true;
        continue;
      }
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue; // A link with no target contributes nothing.
      }
      if (stat.isDirectory()) {
        hadChild = walk(full, base, options, out) || hadChild;
      } else {
        out.push({ kind: 'file', full, rel, size: stat.size });
        hadChild = true;
      }
      continue;
    }

    if (entry.isDirectory()) {
      const childHad = walk(full, base, options, out);
      // An empty directory carries intent and disappears unless recorded as its
      // own entry, since a zip otherwise only implies directories through the
      // paths of the files inside them.
      if (!childHad) out.push({ kind: 'dir', full, rel });
      hadChild = true;
    } else if (entry.isFile()) {
      out.push({ kind: 'file', full, rel, size: fs.statSync(full).size });
      hadChild = true;
    }
  }
  return hadChild;
}

function collect(targets, options) {
  const items = [];
  for (const target of targets) {
    const resolved = path.resolve(target);
    if (!fs.existsSync(resolved)) {
      fail('SRC_NOT_FOUND', `Cannot find "${target}".`, {
        hint: 'Check the path, or pass an absolute path.',
      });
    }
    const stat = fs.lstatSync(resolved);
    const parent = path.dirname(resolved);
    if (stat.isDirectory()) {
      const before = items.length;
      walk(resolved, parent, options, items);
      if (items.length === before) {
        items.push({ kind: 'dir', full: resolved, rel: path.basename(resolved) });
      }
    } else {
      items.push({ kind: 'file', full: resolved, rel: path.basename(resolved), size: stat.size });
    }
  }
  return items;
}

// Refusing to overwrite is what separates a tool that is safe to wire into a
// Finder quick action from one that destroys a file when a second item happens
// to be selected.
function resolveOutput(requested, targets, force) {
  let candidate;
  if (requested) {
    candidate = path.resolve(requested);
  } else if (targets.length === 1) {
    candidate = path.resolve(targets[0]).replace(/\/+$/, '') + '.zip';
  } else {
    candidate = path.join(path.dirname(path.resolve(targets[0])), 'Archive.zip');
  }

  if (force || !fs.existsSync(candidate)) return candidate;

  const dir = path.dirname(candidate);
  const ext = path.extname(candidate);
  const stem = path.basename(candidate, ext);
  for (let n = 2; n < 1000; n += 1) {
    const next = path.join(dir, `${stem}-${n}${ext}`);
    if (!fs.existsSync(next)) return next;
  }
  fail('DEST_EXISTS', `Cannot find a free name next to "${candidate}".`, {
    hint: 'Pass --output with an explicit path.',
  });
}

async function writeArchive(run, items, destination) {
  // Writing to a temporary file and moving it into place on success means a
  // failed run never leaves a half-written archive that still looks usable.
  const temp = path.join(os.tmpdir(), `turink-${process.pid}-${Date.now()}.zip`);
  const zip = new yazl.ZipFile();
  const renames = [];
  const seen = new Set();
  let files = 0;

  for (const item of items) {
    const normalized = item.rel.normalize('NFC');
    const { path: safe, changes } = sanitizePath(normalized);
    if (changes.length > 0) {
      renames.push({ from: normalized, to: safe });
      run.warn('WIN_ILLEGAL_CHAR', { path: normalized, fix: safe });
    }
    if (seen.has(safe)) continue;
    seen.add(safe);

    if (item.kind === 'dir') {
      zip.addEmptyDirectory(safe);
    } else if (item.kind === 'symlink') {
      zip.addBuffer(Buffer.from(item.target), safe, { mode: 0o120777 });
      files += 1;
    } else {
      zip.addFile(item.full, safe);
      files += 1;
      run.progress(files, items.length, safe, 'file');
    }
  }

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(temp);
    stream.on('error', reject);
    stream.on('close', resolve);
    zip.outputStream.on('error', reject);
    zip.outputStream.pipe(stream);
    zip.end();
  });

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(temp, destination);
  return { files, renames };
}

register(
  defineTask({
    id: 'archive.compress',
    title: 'Safe compress',
    summary: 'Create a zip archive that extracts correctly on Windows',
    whenToUse:
      'Sending files or folders with non-ASCII names to someone on Windows, where the built-in Finder compression produces unreadable names.',
    risk: 'create',
    cost: 'proportional',
    accepts: 'paths',
    idempotent: false,
    errors: ['SRC_NOT_FOUND', 'DEST_EXISTS'],
    input: {
      type: 'object',
      required: ['targets'],
      properties: {
        targets: {
          label: 'Items to compress',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'Files or folders to compress. Every positional argument is a target.',
        },
        output: {
          label: 'Output path',
          type: 'string',
          description: 'Path of the archive to write. Defaults to the target name plus .zip.',
        },
        separate: {
          label: 'Separate archives',
          type: 'boolean',
          default: false,
          description: 'Write one archive per target instead of a single combined archive.',
        },
        force: {
          label: 'Overwrite',
          type: 'boolean',
          default: false,
          description: 'Overwrite an existing archive instead of choosing a free name.',
        },
        symlinks: {
          label: 'Symbolic links',
          type: 'string',
          enum: ['store', 'follow', 'skip'],
          default: 'store',
          description: 'How to treat symbolic links.',
        },
        excludeWindowsMetadata: {
          label: 'Exclude Windows metadata',
          type: 'boolean',
          default: false,
          description: 'Also drop Thumbs.db and desktop.ini. They are kept by default.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        archives: { type: 'array', description: 'Paths written, with file counts and sizes.' },
      },
    },
    examples: [
      {
        description: 'Compress one folder next to itself',
        command: 'turink-toys archive.compress ~/Documents/report --json',
      },
      {
        description: 'Compress several items into one archive at a chosen path',
        command: 'turink-toys archive.compress a.txt b/ --output ~/Desktop/bundle.zip',
      },
    ],
    present(result, t) {
      const archives = (result && result.archives) || [];
      const total = archives.reduce((sum, a) => sum + a.files, 0);
      const renamed = archives.reduce((sum, a) => sum + a.renamed, 0);
      return {
        rows: [
          row(t('result.files', 'Files'), String(total)),
          row(t('result.size', 'Size'), formatBytes(archives.reduce((s, a) => s + a.bytes, 0))),
          renamed > 0
            ? row(t('result.renamed', 'Names adjusted'), String(renamed), 'warn')
            : null,
        ].filter(Boolean),
        paths: archives.map((a) => a.output),
      };
    },

    async execute(run, input) {
      const groups = input.separate ? input.targets.map((t) => [t]) : [input.targets];
      const archives = [];

      for (const group of groups) {
        const items = collect(group, input);
        const destination = resolveOutput(input.separate ? null : input.output, group, input.force);
        run.info(`Writing ${destination}`);
        const { files, renames } = await writeArchive(run, items, destination);
        archives.push({
          output: destination,
          files,
          bytes: fs.statSync(destination).size,
          renamed: renames.length,
        });
      }

      return { archives };
    },
  })
);
