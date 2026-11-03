'use strict';

const fs = require('fs');
const path = require('path');
const { defineTask } = require('../../kernel/manifest');
const { register } = require('../../kernel/registry');
const { row } = require('../../kernel/present');
const { requireFolder } = require('./files');
const { isImage, kindOf, compareNames } = require('./formats');

// A package is a folder Finder shows as one file. Browsing into one would show
// the inside of an app or a photo library, which a person never meant to open.
const PACKAGE_EXTENSIONS = ['.app', '.photoslibrary', '.bundle', '.framework', '.plugin', '.pkg'];

function isPackage(name) {
  const lower = name.toLowerCase();
  return PACKAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function visible(name, hidden) {
  return hidden || !name.startsWith('.');
}

// One readdir per subfolder is all the count costs, so a folder of thousands of
// photos is not statted just to be counted.
async function countImages(folder, hidden) {
  try {
    const entries = await fs.promises.readdir(folder, { withFileTypes: true });
    return entries.filter(
      (entry) => (entry.isFile() || entry.isSymbolicLink()) && visible(entry.name, hidden) && isImage(entry.name)
    ).length;
  } catch {
    // A folder that cannot be read still appears, so it is not mistaken for
    // missing; it just shows no count.
    return 0;
  }
}

async function describeImage(folder, entry) {
  const file = path.join(folder, entry.name);
  try {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) return null;
    return { name: entry.name, path: file, bytes: stat.size, modified: stat.mtime.toISOString(), kind: kindOf(entry.name) };
  } catch {
    // A dangling link or a file removed mid-listing is not worth failing for.
    return null;
  }
}

register(
  defineTask({
    id: 'images.list',
    title: 'Browse photos',
    summary: 'List the subfolders and photos in a folder',
    whenToUse:
      'Looking at what photos a folder holds before selecting, copying, moving or trashing any. Reports the folders directly inside, each with a count of its photos, and the photos directly inside, both in Finder order. Hidden files, app and library packages and linked folders are left out. Reads the folder only.',
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
      },
    },
    output: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'The folder that was listed, as an absolute path.' },
        parent: { type: 'string', description: 'The folder above it, or null at the top of the disk.' },
        folders: { type: 'array', description: 'Subfolders as { name, path, images }, where images counts the photos directly inside.' },
        images: { type: 'array', description: 'Photos as { name, path, bytes, modified, kind }. kind is direct, convert or raw.' },
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
          row(t('result.images', 'Photos'), String(((result && result.images) || []).length)),
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
        (entry) => (entry.isFile() || entry.isSymbolicLink()) && visible(entry.name, input.hidden) && isImage(entry.name)
      );

      const [folders, images] = await Promise.all([
        Promise.all(
          subfolders.map(async (entry) => {
            const file = path.join(folder, entry.name);
            return { name: entry.name, path: file, images: await countImages(file, input.hidden) };
          })
        ),
        Promise.all(files.map((entry) => describeImage(folder, entry))),
      ]);

      return {
        folder,
        parent: folder === path.dirname(folder) ? null : path.dirname(folder),
        folders: folders.sort((a, b) => compareNames(a.name, b.name)),
        images: images.filter(Boolean).sort((a, b) => compareNames(a.name, b.name)),
      };
    },
  })
);
