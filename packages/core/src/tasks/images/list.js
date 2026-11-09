'use strict';

const fs = require('fs');
const path = require('path');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { requireFolder, isPackage, visible } = require('./files');
const { isMedia, kindOf, typeOf, compareNames } = require('./formats');

// Folders always lead and always go by name; the sort only orders the files.
// Ties fall back to the name so the order never depends on readdir.
const KIND_ORDER = { photo: 0, video: 1, pdf: 2 };
const SORTS = {
  name: (a, b) => compareNames(a.name, b.name),
  modified: (a, b) => Date.parse(b.modified) - Date.parse(a.modified) || compareNames(a.name, b.name),
  kind: (a, b) => KIND_ORDER[a.type] - KIND_ORDER[b.type] || compareNames(a.name, b.name),
};

async function describeImage(folder, entry) {
  const file = path.join(folder, entry.name);
  try {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) return null;
    return { name: entry.name, path: file, bytes: stat.size, modified: stat.mtime.toISOString(), kind: kindOf(entry.name), type: typeOf(entry.name) };
  } catch {
    // A dangling link or a file removed mid-listing is not worth failing for.
    return null;
  }
}

register(
  defineTask({
    id: 'images.list',
    title: 'Browse photos',
    summary: 'List the subfolders, photos, videos and PDFs in a folder',
    whenToUse:
      'Looking at what photos, videos and PDFs a folder holds before selecting, copying, moving or trashing any. Reports the folders directly inside, always first and in Finder order, and the files directly inside, in Finder order unless sort says otherwise. Hidden files, app and library packages and linked folders are left out. Folders carry no counts; use images.count for those. Reads the folder only.',
    risk: 'read',
    cost: 'cheap',
    idempotent: true,
    errors: ['SRC_NOT_FOUND', 'NOT_A_FOLDER'],
    input: {
      type: 'object',
      properties: {
        folder: {
          label: 'Folder',
          type: 'string',
          positional: true,
          default: '~/Pictures',
          description: 'The folder to look in. "~" stands for the home folder. Defaults to the Pictures folder.',
        },
        hidden: {
          label: 'Show hidden',
          type: 'boolean',
          default: false,
          description: 'Include files and folders whose names start with a dot.',
        },
        sort: {
          label: 'Sort by',
          type: 'string',
          enum: ['name', 'modified', 'kind'],
          default: 'name',
          description: 'How to order the files: name (Finder order), modified (newest first) or kind (photos, then videos, then PDFs, each by name). Folders are always first, by name.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'The folder that was listed, as an absolute path.' },
        parent: { type: 'string', description: 'The folder above it, or null at the top of the disk.' },
        folders: { type: 'array', description: 'Subfolders as { name, path }, in Finder order. Use images.count to count what they hold.' },
        images: { type: 'array', description: 'Photos, videos and PDFs directly inside as { name, path, bytes, modified, kind, type }. kind is direct, convert, raw, video or pdf; type is photo, video or pdf.' },
      },
    },
    examples: [
      { description: 'List the Pictures folder', command: 'turink-toys images.list --json' },
      { description: 'List another folder', command: 'turink-toys images.list ~/Desktop/trip --json' },
    ],
    present(result, t) {
      return {
        rows: [
          row(t('result.folder', 'Folder'), result && result.folder),
          row(t('result.folders', 'Folders'), String(((result && result.folders) || []).length)),
          row(t('result.files', 'Files'), String(((result && result.images) || []).length)),
        ],
      };
    },
    async execute(run, input) {
      const folder = requireFolder(input.folder);
      const entries = await fs.promises.readdir(folder, { withFileTypes: true });

      // A symbolic link to a folder is never followed: a link pointing back up
      // the tree would otherwise make the browser walk in circles. A link to a
      // photo is an ordinary photo.
      const subfolders = entries.filter(
        (entry) => entry.isDirectory() && visible(entry.name, input.hidden) && !isPackage(entry.name)
      );
      const files = entries.filter(
        (entry) => (entry.isFile() || entry.isSymbolicLink()) && visible(entry.name, input.hidden) && isMedia(entry.name)
      );

      const images = await Promise.all(files.map((entry) => describeImage(folder, entry)));
      const sort = SORTS[input.sort] || SORTS.name;

      return {
        folder,
        parent: folder === path.dirname(folder) ? null : path.dirname(folder),
        folders: subfolders
          .map((entry) => ({ name: entry.name, path: path.join(folder, entry.name) }))
          .sort(SORTS.name),
        images: images.filter(Boolean).sort(sort),
      };
    },
  })
);
