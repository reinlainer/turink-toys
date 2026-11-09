'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { Readable } = require('stream');
const { pathToFileURL } = require('url');
const { protocol, net } = require('electron');
const { images: formats } = require('@turink/core');

// Photos, videos and PDFs reach the windows through two schemes of our own
// rather than file://, so a page can only ever load the files the Images screen
// shows, and the photo formats Chromium cannot draw are converted on the way.
//
// Electron's own nativeImage cannot read HEIC or TIFF, and its thumbnail call
// returns the square that was asked for whatever the photo's shape. The macOS
// tools are used instead: sips converts at full size, and qlmanage produces the
// same thumbnails Finder shows, for every format Quick Look understands.

const IMAGE = 'turink-image';
const THUMB = 'turink-thumb';
const CACHE = path.join(os.homedir(), 'Library', 'Caches', 'Turink Toys', 'images');
const CACHE_LIMIT = 500 * 1024 * 1024;
const BATCH_DELAY = 30;
const BATCH_SIZE = 24;

function registerSchemes() {
  protocol.registerSchemesAsPrivileged(
    [IMAGE, THUMB].map((scheme) => ({
      scheme,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    }))
  );
}

// The page sends the whole path as one encoded segment, so the URL parser
// never normalises a ".." in it.
function targetOf(url) {
  try {
    const file = decodeURIComponent(new URL(url).pathname.slice(1));
    if (!path.isAbsolute(file) || !formats.isMedia(file)) return null;
    return fs.statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

const notFound = () => new Response(null, { status: 404 });
const fromFile = (file) => net.fetch(pathToFileURL(file).toString());

function cacheKey(file, suffix) {
  const stat = fs.statSync(file);
  return crypto.createHash('sha1').update(`${file}\0${stat.mtimeMs}\0${stat.size}\0${suffix}`).digest('hex');
}

// A cache hit refreshes the file's time, which is what the pruning orders by.
function cached(file) {
  try {
    const now = new Date();
    fs.utimesSync(file, now, now);
    return true;
  } catch {
    return false;
  }
}

const exec = (command, args) =>
  new Promise((resolve, reject) => execFile(command, args, { timeout: 60000 }, (err) => (err ? reject(err) : resolve())));

// ------------------------------------------------------------ full size

const converting = new Map();

function converted(file) {
  const out = path.join(CACHE, `${cacheKey(file, 'full')}.jpg`);
  if (cached(out)) return Promise.resolve(out);
  if (converting.has(out)) return converting.get(out);
  const job = (async () => {
    fs.mkdirSync(CACHE, { recursive: true });
    const partial = `${out}.${process.pid}.part.jpg`;
    await exec('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', file, '--out', partial]);
    fs.renameSync(partial, out);
    written();
    return out;
  })().finally(() => converting.delete(out));
  converting.set(out, job);
  return job;
}

// ------------------------------------------------------------ video and PDF

const TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  pdf: 'application/pdf',
};

// A video is read in pieces as it plays and as the person seeks, so a range
// request gets exactly that range back. Handing the file to net.fetch would
// answer every request with the whole file, which makes seeking in a large
// video wait for all of it.
function serveFile(file, request) {
  const size = fs.statSync(file).size;
  const headers = {
    'Content-Type': TYPES[formats.extensionOf(file)] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!range || (range[1] === '' && range[2] === '')) {
    return new Response(Readable.toWeb(fs.createReadStream(file)), {
      status: 200,
      headers: { ...headers, 'Content-Length': String(size) },
    });
  }
  // "bytes=-500" asks for the last 500 bytes.
  let start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  let end = range[1] !== '' && range[2] !== '' ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
    status: 206,
    headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
  });
}

async function serveImage(request) {
  const file = targetOf(request.url);
  if (!file) return notFound();
  try {
    const kind = formats.kindOf(file);
    if (kind === 'video' || kind === 'pdf') return serveFile(file, request);
    return fromFile(kind === 'direct' ? file : await converted(file));
  } catch {
    return notFound();
  }
}

// ------------------------------------------------------------ file facts

// How long a video runs and how many pages a PDF has, from Spotlight, which
// already knows without the file being opened. A folder Spotlight does not
// index, such as a Google Drive one, answers with nothing, and the screen
// then learns a video's length from the player instead.
function facts(file) {
  return new Promise((resolve) => {
    if (!path.isAbsolute(file) || !formats.isMedia(file)) return resolve({});
    execFile(
      '/usr/bin/mdls',
      ['-raw', '-name', 'kMDItemDurationSeconds', '-name', 'kMDItemNumberOfPages', '-name', 'kMDItemPixelWidth', '-name', 'kMDItemPixelHeight', file],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) return resolve({});
        const [duration, pages, width, height] = String(stdout).split('\0').map((v) => (v === '(null)' || v === '' ? null : Number(v)));
        resolve({ duration, pages, width, height });
      }
    );
  });
}

// ------------------------------------------------------------ thumbnails

// Requests arriving together, as a grid scrolling into view makes them, share
// one qlmanage run. It names each output after the source file, so a batch
// never holds two files with the same name.
const waiting = [];
const inFlight = new Map();
let batchTimer = null;

function thumbnail(file, size) {
  const out = path.join(CACHE, `${cacheKey(file, `thumb${size}`)}.png`);
  if (cached(out)) return Promise.resolve(out);
  if (inFlight.has(out)) return inFlight.get(out);
  const job = new Promise((resolve, reject) => waiting.push({ file, size, out, resolve, reject })).finally(() =>
    inFlight.delete(out)
  );
  inFlight.set(out, job);
  if (!batchTimer) batchTimer = setTimeout(flush, BATCH_DELAY);
  return job;
}

function flush() {
  batchTimer = null;
  const jobs = waiting.splice(0);
  const batches = [];
  for (const job of jobs) {
    const name = path.basename(job.file);
    let batch = batches.find(
      (b) => b.size === job.size && b.jobs.length < BATCH_SIZE && !b.jobs.some((j) => path.basename(j.file) === name)
    );
    if (!batch) batches.push((batch = { size: job.size, jobs: [] }));
    batch.jobs.push(job);
  }
  for (const batch of batches) runBatch(batch);
}

async function runBatch({ size, jobs }) {
  let dir = null;
  try {
    fs.mkdirSync(CACHE, { recursive: true });
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'turink-thumbs-'));
    await exec('/usr/bin/qlmanage', ['-t', '-s', String(size), '-o', dir, ...jobs.map((j) => j.file)]).catch(() => {});
    for (const job of jobs) {
      const produced = path.join(dir, `${path.basename(job.file)}.png`);
      if (fs.existsSync(produced)) {
        fs.renameSync(produced, job.out);
        job.resolve(job.out);
      } else {
        job.reject(new Error('no thumbnail'));
      }
    }
    written(jobs.length);
  } catch (err) {
    for (const job of jobs) job.reject(err);
  } finally {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function serveThumb(request) {
  const file = targetOf(request.url);
  if (!file) return notFound();
  const asked = Number(new URL(request.url).searchParams.get('s'));
  // Sizes are rounded up to a few steps so the cache is shared between the
  // grid, the preview and the strip as the person resizes them.
  const size = [128, 256, 512, 1024].find((s) => s >= asked) || 1024;
  try {
    return fromFile(await thumbnail(file, size));
  } catch {
    return notFound();
  }
}

// ------------------------------------------------------------ cache size

let writes = 0;
function written(count = 1) {
  writes += count;
  if (writes >= 200) {
    writes = 0;
    setImmediate(prune);
  }
}

function prune() {
  try {
    const files = fs
      .readdirSync(CACHE)
      .map((name) => {
        const full = path.join(CACHE, name);
        const stat = fs.statSync(full);
        return { full, size: stat.size, time: stat.mtimeMs };
      })
      .sort((a, b) => a.time - b.time);
    let total = files.reduce((sum, f) => sum + f.size, 0);
    for (const f of files) {
      if (total <= CACHE_LIMIT) break;
      fs.rmSync(f.full, { force: true });
      total -= f.size;
    }
  } catch {
    // A cache that cannot be read is rebuilt on demand.
  }
}

function handleProtocols() {
  protocol.handle(IMAGE, serveImage);
  protocol.handle(THUMB, serveThumb);
  setTimeout(prune, 10000);
}

module.exports = { registerSchemes, handleProtocols, facts };
