'use strict';

const fs = require('fs');
const path = require('path');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { normalize } = require('../folders/store');
const { statOrNull, isPackage, visible } = require('./files');
const { typeOf, compareNames } = require('./formats');

// A count is a hint shown next to a folder, so it is bounded rather than exact:
// a library of hundreds of thousands of files must not make the screen wait.
const MAX_FILES = 1000;
const MAX_DEPTH = 8;
const BUDGET_MS = 1500;
const MAX_PREVIEWS = 9;
const CACHE_MS = 60 * 1000;

// Keyed by folder path and its modification time, so a folder that changed is
// counted again at once while a screen asking repeatedly costs nothing.
const cache = new Map();

// Only directory listings are read, never the files themselves: a file kept in
// the cloud shows up as a placeholder, and statting or opening it can start a
// download. readdir with file types answers from the listing alone.
async function walk(root, hidden, now = Date.now) {
  const counts = { photos: 0, videos: 0, pdfs: 0 };
  const photos = [];
  const videos = [];
  let folders = 0;
  let capped = false;
  let partial = false;
  const deadline = now() + BUDGET_MS;

  // Breadth first, so previews come from the shallowest files and a deep
  // tree cannot use up the budget before the top levels were counted.
  let level = [root];
  for (let depth = 0; level.length > 0 && depth <= MAX_DEPTH && !capped && !partial; depth += 1) {
    const next = [];
    for (const folder of level) {
      if (now() > deadline) {
        partial = true;
        break;
      }
      let entries;
      try {
        entries = await fs.promises.readdir(folder, { withFileTypes: true });
      } catch {
        // A subfolder that cannot be read is skipped without a word.
        continue;
      }
      entries.sort((a, b) => compareNames(a.name, b.name));

      for (const entry of entries) {
        if (!visible(entry.name, hidden)) continue;
        // A link to a folder is never followed, so a link back up the tree
        // cannot make the walk circle. A link to a file counts as a file.
        if (entry.isDirectory()) {
          if (isPackage(entry.name)) continue;
          if (folder === root) folders += 1;
          next.push(path.join(folder, entry.name));
          continue;
        }
        if (!entry.isFile() && !entry.isSymbolicLink()) continue;
        const type = typeOf(entry.name);
        if (type === null) continue;
        if (type === 'photo') {
          counts.photos += 1;
          photos.push(path.join(folder, entry.name));
        } else if (type === 'video') {
          counts.videos += 1;
          videos.push(path.join(folder, entry.name));
        } else {
          counts.pdfs += 1;
        }
        if (counts.photos + counts.videos + counts.pdfs >= MAX_FILES) {
          capped = true;
          break;
        }
      }
      if (capped) break;
    }
    level = next;
  }

  // Videos stand in only when there are too few photos to fill the strip.
  const previews = photos.length >= MAX_PREVIEWS ? photos : photos.concat(videos);
  return { ...counts, folders, capped, partial, previews: previews.slice(0, MAX_PREVIEWS) };
}

async function countFolder(raw, hidden) {
  const folder = normalize(raw);
  const stat = statOrNull(folder);
  if (!stat) return { path: folder, error: 'SRC_NOT_FOUND' };
  if (!stat.isDirectory()) return { path: folder, error: 'NOT_A_FOLDER' };

  const key = `${hidden ? 'h' : 'v'}:${folder}`;
  const cached = cache.get(key);
  if (cached && cached.mtimeMs === stat.mtimeMs && Date.now() - cached.at < CACHE_MS) return cached.value;

  const value = { path: folder, ...(await walk(folder, hidden)) };
  // A cut-short count would be remembered as if it were complete.
  if (!value.partial) cache.set(key, { mtimeMs: stat.mtimeMs, at: Date.now(), value });
  return value;
}

register(
  defineTask({
    id: 'images.count',
    title: 'Count photos',
    summary: 'Count the photos, videos and PDFs inside folders, and pick a few to preview',
    whenToUse:
      'Showing what folders hold without opening them. For each folder, counts photos, videos and PDFs at every depth, the folders directly inside, and up to nine photos or videos to preview. The count stops at 1000 files (capped) or after 1.5 seconds (partial), so it is a guide, not a total. Only folder listings are read, never the files, so files kept in the cloud are not downloaded. A path that is missing or not a folder gets an error entry while the others are still counted.',
    risk: 'read',
    cost: 'cheap',
    idempotent: true,
    errors: [],
    input: {
      type: 'object',
      required: ['folders'],
      properties: {
        folders: {
          label: 'Folders',
          type: 'array',
          positional: true,
          minItems: 1,
          description: 'The folders to count in, by path. "~" stands for the home folder.',
        },
        hidden: {
          label: 'Show hidden',
          type: 'boolean',
          default: false,
          description: 'Include files and folders whose names start with a dot.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        folders: {
          type: 'array',
          description:
            'One entry per folder asked, in order, as { path, photos, videos, pdfs, folders, capped, partial, previews }. folders counts the subfolders directly inside, capped means the count stopped at 1000 files, partial means time ran out, previews holds up to nine photo or video paths. A folder that could not be counted is { path, error } with SRC_NOT_FOUND or NOT_A_FOLDER.',
        },
      },
    },
    examples: [
      { description: 'Count what two folders hold', command: 'turink-toys images.count ~/Pictures ~/Desktop/trip --json' },
    ],
    present(result, t) {
      const list = (result && result.folders) || [];
      return {
        rows: [
          row(t('result.folders', 'Folders'), String(list.length)),
          row(t('result.files', 'Files'), String(list.reduce((sum, f) => sum + (f.photos || 0) + (f.videos || 0) + (f.pdfs || 0), 0))),
        ],
      };
    },
    async execute(run, input) {
      const folders = [];
      for (const raw of input.folders) folders.push(await countFolder(raw, input.hidden === true));
      return { folders };
    },
  })
);

module.exports = { MAX_FILES, MAX_DEPTH, BUDGET_MS, MAX_PREVIEWS, walk, cache };
