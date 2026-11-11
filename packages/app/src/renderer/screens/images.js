'use strict';

// Photos, videos and PDFs in a folder. The thumbnail column has the path above
// it, a strip for what is selected when anything is, and a bar below for how
// the list is shown; the preview beside it shows the focused item large.
// Reading a folder, counting what its subfolders hold, selecting and copying or
// moving all go through images.* tasks, so the command line and an agent see
// the same folders and the same selection. Double-clicking opens the viewer.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);
  const { createPreview, countLine, clock, thumbURL } = window.TurinkImagesPreview;

  const folderKey = (file) => `folder:${file}`;
  const isFolderKey = (key) => typeof key === 'string' && key.startsWith('folder:');
  // Thumbnails come in a few sizes so the cache is shared as the grid grows;
  // a tile is asked again only when it outgrows the size it has.
  const STEPS = [128, 256, 512, 1024];
  const step = (size) => STEPS.find((s) => s >= size * (window.devicePixelRatio || 1)) || 1024;

  // Conveniences kept per window rather than as settings shared with the
  // command line: thumbnail size, sort order and where items were sent.
  const local = {
    get(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(`images.${key}`));
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`images.${key}`, JSON.stringify(value));
      } catch {
        // Losing a convenience is harmless.
      }
    },
  };

  // Messages from the main process arrive once per window, so they are routed
  // to whichever instance of the screen is mounted.
  let active = null;
  window.turink.onImagesShow((folder) => active && active.openFolder(folder));
  window.turink.onImagesChanged((folder) => active && active.refresh(folder));
  window.turink.onViewerClosed((file) => active && active.focusFile(file));
  window.turink.onImagesView((view) => active && active.setView(view));

  screens.push({
    id: 'images',
    icon: 'image',
    tasks: [
      'images.list',
      'images.count',
      'images.selected',
      'images.select',
      'images.copy',
      'images.move',
      'images.trash',
      'images.restore',
      'images.default-app',
      'images.set-default-app',
    ],

    mount(root, ctx) {
      const { el, icon, s, format, formatBytes } = ctx;
      const t = () => s().images;
      const files = window.TurinkFileActions.create({ strings: s, toast: ctx.toast, format });
      const state = {
        folder: null,
        home: null,
        appId: null,
        listing: null,
        counts: new Map(),
        picks: [],
        // The picked paths again, for lookups that run once per tile.
        pickedSet: new Set(),
        // While only the picked items are shown, the list stays as it was when
        // the view opened: an item whose pick is undone stays in place, faded,
        // so a slip is one click to take back.
        pickView: null,
        // Pick changes made here, newest last, for ⌘Z and ⇧⌘Z.
        history: [],
        future: [],
        // Where a ⇧-click range starts.
        anchor: null,
        scope: 'folder',
        selected: null,
        tile: local.get('tile', 132),
        sort: local.get('sort', 'name'),
        view: { wheel: 'nav', windowSize: 'first' },
      };

      // ------------------------------------------------ layout

      const body = el('div', 'images-body');
      const gridColumn = el('div', 'images-grid-column');
      const toolbar = el('div', 'images-toolbar');
      const placeButton = el('button', 'images-place');
      placeButton.type = 'button';
      placeButton.title = t().openFolder;
      placeButton.setAttribute('aria-label', t().openFolder);
      placeButton.append(icon('folder', null, 16), icon('chevron-down', null, 13));
      const crumbs = el('div', 'images-crumbs');
      toolbar.append(placeButton, crumbs);
      const pickStrip = el('div', 'images-pick-strip');
      pickStrip.hidden = true;
      const gridWrap = el('div', 'images-grid-wrap');
      gridWrap.tabIndex = 0;
      const grid = el('div', 'images-grid');
      gridWrap.appendChild(grid);
      const statusBar = el('div', 'images-status');
      gridColumn.append(toolbar, pickStrip, gridWrap, statusBar);
      const splitter = el('div', 'images-splitter');
      const pane = el('aside', 'images-preview');
      pane.style.width = `${local.get('previewWidth', 380)}px`;
      body.append(gridColumn, splitter, pane);
      root.appendChild(body);

      // ------------------------------------------------ data

      const items = () => (state.scope === 'picks' ? state.pickView || [] : state.listing ? state.listing.images : []);
      const subfolders = () => (state.scope === 'folder' && state.listing ? state.listing.folders : []);
      const entries = () => [...subfolders().map((f) => folderKey(f.path)), ...items().map((i) => i.path)];
      const isPicked = (file) => state.pickedSet.has(file);
      const baseName = (file) => file.split('/').filter(Boolean).pop() || file;
      const itemOf = (key) => items().find((i) => i.path === key);
      const folderOf = (key) => subfolders().find((f) => folderKey(f.path) === key);
      const folderPath = (key) => key.slice('folder:'.length);

      // Acting on a picked item acts on every picked item, as Finder does with
      // a selection; any other item is acted on alone.
      const targetsOf = (file) => (isPicked(file) && state.picks.length > 1 ? state.picks.map((p) => p.path) : [file]);

      // Picked items from several folders are shown folder by folder, in the
      // order each folder was first picked from.
      function byFolder(list) {
        const groups = new Map();
        for (const item of list) {
          if (!groups.has(item.folder)) groups.set(item.folder, []);
          groups.get(item.folder).push(item);
        }
        return [...groups.values()].flat();
      }

      // The path is read from the home folder down when it lies inside it, as
      // Finder's path bar does, and from the disk otherwise.
      function trail(folder) {
        const home = state.home;
        const inHome = home && (folder === home || folder.startsWith(`${home}/`));
        const parts = [inHome ? { name: s().folders.placeHome, path: home } : { name: s().folders.placeDisk, path: '/' }];
        let at = inHome ? home : '';
        for (const name of folder.slice(inHome ? home.length : 0).split('/').filter(Boolean)) {
          at = `${at}/${name}`;
          parts.push({ name, path: at });
        }
        return parts;
      }

      function places() {
        const f = s().folders;
        const home = state.home;
        return [
          { name: f.placeHome, path: home },
          { name: f.placeDesktop, path: `${home}/Desktop` },
          { name: f.placeDownloads, path: `${home}/Downloads` },
          { name: t().placePictures, path: `${home}/Pictures` },
        ];
      }

      // images.select takes the domain lock, and two calls from this window at
      // once would collide, so they run one after another.
      let selecting = Promise.resolve();
      function selectCall(input) {
        const next = selecting.then(() => ctx.peek('images.select', input));
        selecting = next.catch(() => {});
        return next;
      }

      async function loadPicks() {
        const outcome = await ctx.peek('images.selected');
        state.picks = outcome.ok ? outcome.result.images : [];
        state.pickedSet = new Set(state.picks.map((p) => p.path));
      }

      async function list(folder) {
        return ctx.peek('images.list', { folder, sort: state.sort });
      }

      async function openFolder(folder, focus) {
        const outcome = await list(folder);
        if (!outcome.ok) {
          ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
          return;
        }
        state.scope = 'folder';
        state.folder = outcome.result.folder;
        state.listing = outcome.result;
        window.turink.rememberImagesFolder(state.folder);
        window.turink.watchImagesFolder(state.folder);
        const all = entries();
        state.selected = focus && all.includes(focus) ? focus : items()[0] ? items()[0].path : all[0] || null;
        renderAll();
        gridWrap.scrollTop = 0;
        scrollToSelected();
        gridWrap.focus();
        countFolders();
      }

      async function refresh(folder) {
        if (folder !== state.folder) return;
        const outcome = await list(folder);
        if (!outcome.ok) return;
        state.listing = outcome.result;
        if (!entries().includes(state.selected)) state.selected = entries()[0] || null;
        renderAll();
        countFolders();
      }

      async function setScope(scope) {
        state.scope = scope;
        if (scope === 'picks') {
          await loadPicks();
          state.pickView = byFolder(state.picks);
        } else state.pickView = null;
        const all = entries();
        if (!all.includes(state.selected)) state.selected = items()[0] ? items()[0].path : all[0] || null;
        renderAll();
        gridWrap.focus();
      }

      // What each subfolder holds is counted after the folder is on screen,
      // a few folders per call, so a folder of many subfolders opens at once
      // and its tiles fill in. Moving to another folder abandons the rest.
      let counting = 0;
      async function countFolders() {
        const run = ++counting;
        const folder = state.folder;
        const paths = subfolders().map((f) => f.path).filter((p) => !state.counts.has(p));
        for (let i = 0; i < paths.length; i += 6) {
          const outcome = await ctx.peek('images.count', { folders: paths.slice(i, i + 6) });
          if (run !== counting || folder !== state.folder) return;
          if (!outcome.ok) return;
          for (const count of outcome.result.folders) {
            if (count.error) continue;
            state.counts.set(count.path, count);
            updateFolderTile(count.path);
            if (state.selected === folderKey(count.path)) renderPreview();
          }
        }
      }

      // ------------------------------------------------ path

      function renderToolbar() {
        crumbs.textContent = '';
        placeButton.hidden = state.scope === 'picks';
        if (state.scope === 'picks') {
          const back = el('button', 'images-back');
          back.type = 'button';
          back.title = t().backToFolder;
          back.append(icon('chevron', 'images-back-icon', 14), el('span', null, state.folder ? baseName(state.folder) : ''));
          back.addEventListener('click', () => setScope('folder'));
          crumbs.append(back, el('span', 'images-view-title', t().picksTitle));
          return;
        }
        if (!state.listing) return;
        const parts = trail(state.folder);
        // A deep path keeps where it starts and the folders nearest the current
        // one, which are the ones that tell similar paths apart.
        const shown = parts.length > 5 ? [parts[0], null, ...parts.slice(-3)] : parts;
        shown.forEach((part, i) => {
          if (i > 0) crumbs.appendChild(icon('chevron', 'images-crumb-sep', 12));
          if (!part) {
            crumbs.appendChild(el('span', 'images-crumb-gap', '…'));
            return;
          }
          const index = parts.indexOf(part);
          const last = index === parts.length - 1;
          const b = el('button', 'images-crumb' + (last ? ' last' : ''), part.name);
          b.type = 'button';
          b.title = part.path;
          if (!last) b.addEventListener('click', () => openFolder(part.path, folderKey(parts[index + 1].path)));
          crumbs.appendChild(b);
        });
      }

      // ------------------------------------------------ selection strip

      // The strip's buttons shrink to icons when the column is narrow, so each
      // carries a tooltip that appears at once rather than after the system's
      // delay.
      function tip(node, text) {
        node.dataset.tip = text;
        node.setAttribute('aria-label', text);
      }

      function stripButton(iconName, label, tipText, onClick) {
        const b = el('button', 'images-strip-button');
        b.type = 'button';
        tip(b, tipText);
        b.append(icon(iconName, null, 14));
        if (label) b.appendChild(el('span', 'images-strip-label', label));
        b.addEventListener('click', onClick);
        return b;
      }

      // Left: what is selected and the way to see only that. Right: what can
      // be done with it, the same actions the right-click menu offers.
      function renderPickStrip() {
        pickStrip.textContent = '';
        pickStrip.hidden = state.picks.length === 0 && state.scope !== 'picks';
        if (pickStrip.hidden) return;
        const picked = state.picks.map((p) => p.path);
        const none = picked.length === 0;
        const clear = el('button', 'images-strip-clear');
        clear.type = 'button';
        clear.disabled = none;
        tip(clear, t().clearSelection);
        clear.appendChild(icon('close', null, 14));
        clear.addEventListener('click', clearPicks);
        const only = el('button', 'images-strip-only' + (state.scope === 'picks' ? ' on' : ''));
        only.type = 'button';
        tip(only, t().showPicked);
        only.setAttribute('aria-pressed', String(state.scope === 'picks'));
        only.append(icon('filter', null, 13), el('span', 'images-strip-label', t().showPicked));
        only.addEventListener('click', () => setScope(state.scope === 'picks' ? 'folder' : 'picks'));

        const count = el('span', 'images-strip-count', format(t().pickedCount, { count: picked.length }));
        // Picks kept from other folders are easy to forget, so the strip says
        // how many of them are in the folder on screen.
        if (state.scope === 'folder' && state.listing) {
          const here = state.listing.images.filter((i) => isPicked(i.path)).length;
          if (here !== picked.length) count.appendChild(el('span', 'images-strip-here', format(t().inThisFolder, { count: here })));
        }

        const finder = stripButton('finder', s().files.reveal, s().files.reveal, () => files.reveal(picked));
        const share = stripButton('share', s().files.share, s().files.share, () => files.share(picked, share));
        const send = stripButton('move', t().send, t().sendTip, (event) => {
          event.stopPropagation();
          menu(send, (box) => {
            box.appendChild(el('div', 'images-menu-head', format(s().files.selectedHead, { count: picked.length })));
            box.appendChild(menuItem(s().files.copyTo, () => transfer('copy', picked), { icon: 'copy' }));
            box.appendChild(menuItem(s().files.moveTo, () => transfer('move', picked), { icon: 'move' }));
          });
        });
        send.appendChild(icon('chevron-down', 'images-strip-caret', 11));
        const more = stripButton('other', '', t().more, (event) => {
          event.stopPropagation();
          menu(more, (box) => {
            box.appendChild(menuItem(s().files.copy, () => files.copy(picked), { icon: 'copy', key: '⌘C' }));
            box.appendChild(menuItem(s().files.copyPath, () => files.copyPath(picked), { key: '⌥⌘C' }));
            box.appendChild(menuItem(s().files.openDefault, () => openDefault(picked), { icon: 'external' }));
            box.appendChild(el('div', 'images-menu-sep'));
            box.appendChild(menuItem(t().selectAllHere, selectAllShown, { key: '⌘A' }));
            box.appendChild(el('div', 'images-menu-sep'));
            box.appendChild(menuItem(s().files.trash, () => trash(picked), { danger: true, key: '⌘⌫' }));
          });
        });
        more.classList.add('icon-only');
        for (const b of [finder, share, send, more]) b.disabled = none;
        pickStrip.append(clear, count, only, el('span', 'images-spacer'), finder, share, send, more);
      }

      // ------------------------------------------------ status bar

      function renderStatus() {
        statusBar.textContent = '';
        const files = items();
        const tally = { photo: 0, video: 0, pdf: 0 };
        for (const f of files) tally[f.type] = (tally[f.type] || 0) + 1;
        const parts = [];
        if (state.scope === 'picks') {
          const folders = new Set(state.picks.map((p) => p.folder)).size;
          parts.push(format(t().picksSummary, { count: state.picks.length, folders }));
          tally.photo = tally.video = tally.pdf = 0;
        }
        if (state.scope === 'folder') parts.push(format(t().folderCount, { count: subfolders().length }));
        if (tally.photo) parts.push(format(t().photoCount, { count: tally.photo }));
        if (tally.video) parts.push(format(t().videoCount, { count: tally.video }));
        if (tally.pdf) parts.push(format(t().pdfCount, { count: tally.pdf }));
        statusBar.appendChild(el('span', 'images-status-count', parts.join(' · ')));

        const sortButton = el('button', 'images-status-button');
        sortButton.type = 'button';
        tip(sortButton, t().sortBy);
        sortButton.append(icon('sort', null, 14), el('span', 'images-status-label', sortLabel(state.sort)));
        sortButton.addEventListener('click', (event) => {
          event.stopPropagation();
          menu(sortButton, (box) => {
            box.appendChild(el('div', 'images-menu-head', t().sortBy));
            for (const value of ['name', 'modified', 'kind']) {
              box.appendChild(menuItem(sortLabel(value), () => setSort(value), { on: state.sort === value }));
            }
            box.appendChild(el('div', 'images-menu-tip', t().foldersFirst));
          });
        });

        const size = el('label', 'images-status-size');
        tip(size, t().thumbSize);
        const range = el('input');
        range.type = 'range';
        range.min = '88';
        range.max = '220';
        range.value = String(state.tile);
        range.setAttribute('aria-label', t().thumbSize);
        range.addEventListener('input', () => setTile(Number(range.value)));
        size.append(icon('image', 'small', 12), range, icon('image', null, 16));

        const viewButton = el('button', 'images-status-button');
        viewButton.type = 'button';
        tip(viewButton, t().viewSettings);
        viewButton.appendChild(icon('gear', null, 16));
        viewButton.addEventListener('click', (event) => {
          event.stopPropagation();
          viewMenu(viewButton);
        });

        statusBar.append(sortButton, el('span', 'images-status-sep'), size, el('span', 'images-status-sep'), viewButton);
      }

      const sortLabel = (value) => ({ name: t().sortName, modified: t().sortModified, kind: t().sortKind })[value];

      async function setSort(value) {
        state.sort = value;
        local.set('sort', value);
        if (state.scope === 'folder' && state.folder) await refresh(state.folder);
        else renderStatus();
      }

      // ------------------------------------------------ grid

      // Thumbnails load as their tiles scroll into view, so a folder of
      // thousands of items opens at once.
      const seen = new IntersectionObserver(
        (records) => {
          for (const record of records) {
            if (!record.isIntersecting) continue;
            loadThumb(record.target);
            seen.unobserve(record.target);
            const pending = record.target.parentElement && record.target.parentElement.querySelector('.images-badge[data-video]');
            if (pending) videoLength(pending);
          }
        },
        { root: gridWrap, rootMargin: '300px' }
      );

      function loadThumb(img) {
        const wanted = step(img.dataset.mosaic ? state.tile / 2 : state.tile);
        img.dataset.step = String(wanted);
        img.src = thumbURL(img.dataset.file, wanted / (window.devicePixelRatio || 1));
      }

      function thumbImg(file, mosaic) {
        const img = el('img');
        img.alt = '';
        img.draggable = false;
        img.dataset.file = file;
        if (mosaic) img.dataset.mosaic = '1';
        img.addEventListener('error', () => img.classList.add('missing'));
        seen.observe(img);
        return img;
      }

      // A folder shows up to four of the photos inside it, from its subfolders
      // too, with a small folder mark so it still reads as a folder.
      function folderThumb(folder) {
        const count = state.counts.get(folder.path);
        const previews = count ? count.previews.slice(0, 4) : [];
        if (previews.length === 0) {
          const thumb = el('div', 'images-thumb folder');
          thumb.appendChild(icon('folder', null, 56));
          return thumb;
        }
        const thumb = el('div', `images-thumb folder-mosaic n${previews.length}`);
        for (const file of previews) thumb.appendChild(thumbImg(file, true));
        const mark = el('span', 'images-folder-mark');
        mark.appendChild(icon('folder', null, 12));
        thumb.appendChild(mark);
        return thumb;
      }

      function folderSub(folder) {
        const count = state.counts.get(folder.path);
        if (!count) return t().counting;
        const line = countLine(count, t(), format);
        if (line) return line.split(' · ')[0];
        return count.folders ? format(t().folderCount, { count: count.folders }) : t().emptyFolderTile;
      }

      function folderTile(folder) {
        const key = folderKey(folder.path);
        const tile = el('div', 'images-tile' + (key === state.selected ? ' current' : ''));
        tile.dataset.key = key;
        tile.draggable = true;
        tile.append(folderThumb(folder), el('div', 'images-tile-name', folder.name), el('div', 'images-tile-sub', folderSub(folder)));
        tile.addEventListener('mousedown', (event) => {
          if (event.button === 0) select(key);
        });
        tile.addEventListener('dblclick', () => openFolder(folder.path));
        return tile;
      }

      function updateFolderTile(path) {
        const folder = subfolders().find((f) => f.path === path);
        const old = folder && tileOf(folderKey(path));
        if (!old) return;
        const fresh = folderTile(folder);
        old.replaceWith(fresh);
        tiles.set(fresh.dataset.key, fresh);
      }

      function badge(item) {
        if (item.type === 'pdf') return el('span', 'images-badge', 'PDF');
        if (item.type !== 'video') return null;
        const b = el('span', 'images-badge');
        b.append(icon('play', null, 9));
        // The length is looked up when the tile scrolls into view, with its
        // thumbnail, so a folder of hundreds of videos does not start hundreds
        // of lookups the moment it opens.
        b.dataset.video = item.path;
        return b;
      }

      // The length comes from Spotlight. A folder it does not index, such as
      // a Google Drive one, is asked of the player instead, which reads only
      // the part of the file that holds it.
      function videoLength(b) {
        const file = b.dataset.video;
        delete b.dataset.video;
        window.turink.imageFacts(file).then((f) => {
          if (f && f.duration) return b.appendChild(document.createTextNode(clock(f.duration)));
          const probe = document.createElement('video');
          probe.preload = 'metadata';
          probe.muted = true;
          probe.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(probe.duration)) b.appendChild(document.createTextNode(clock(probe.duration)));
            probe.removeAttribute('src');
            probe.load();
          });
          probe.src = window.TurinkImagesPreview.fileURL(file);
        });
      }

      function fileTile(item) {
        const tile = el('div', 'images-tile');
        tile.dataset.key = item.path;
        tile.draggable = true;
        markTile(tile);
        const thumb = el('div', 'images-thumb' + (item.type === 'pdf' ? ' pdf' : ''));
        thumb.appendChild(thumbImg(item.path));
        const mark = badge(item);
        if (mark) thumb.appendChild(mark);
        // The circle shows on hover and stays once picked, as in Photos.
        const pick = el('span', 'images-pick-dot');
        pick.title = t().select;
        pick.appendChild(icon('check', null, 12));
        pick.addEventListener('mousedown', (event) => {
          event.stopPropagation();
          if (event.button !== 0) return;
          select(item.path);
          state.anchor = item.path;
          togglePick(item.path);
        });
        // Shown only on an item whose pick was undone while viewing the picks.
        const again = el('button', 'images-pick-again', t().pickAgain);
        again.type = 'button';
        again.addEventListener('mousedown', (event) => {
          event.stopPropagation();
          if (event.button !== 0) return;
          select(item.path);
          changePicks([item.path], []);
        });
        thumb.appendChild(again);
        tile.append(thumb, pick, el('div', 'images-tile-name', item.name));
        tile.addEventListener('mousedown', (event) => clickFile(event, item.path));
        tile.addEventListener('dblclick', (event) => {
          if (!event.metaKey && !event.shiftKey) openViewer(item.path);
        });
        return tile;
      }

      // Focused, picked, or picked once and undone while viewing the picks.
      function markTile(tile) {
        const key = tile.dataset.key;
        const picked = isPicked(key);
        tile.classList.toggle('current', key === state.selected);
        tile.classList.toggle('picked', picked);
        tile.classList.toggle('dropped', state.scope === 'picks' && !picked);
      }

      // A click focuses; ⌘-click picks or unpicks; ⇧-click adds the run of
      // items from the last one clicked, as in Finder and Photos.
      function clickFile(event, file) {
        if (event.button !== 0) return;
        if (event.metaKey) {
          select(file);
          state.anchor = file;
          togglePick(file);
          return;
        }
        if (event.shiftKey && state.anchor) {
          const list = items().map((i) => i.path);
          const from = list.indexOf(state.anchor);
          const to = list.indexOf(file);
          select(file);
          if (from === -1 || to === -1) return;
          const run = list.slice(Math.min(from, to), Math.max(from, to) + 1);
          changePicks(run, [], { label: format(t().addedRange, { count: run.filter((p) => !isPicked(p)).length }), undoable: true });
          return;
        }
        select(file);
        state.anchor = file;
      }

      function renderGrid() {
        seen.disconnect();
        grid.textContent = '';
        tiles.clear();
        grid.style.setProperty('--tile', `${state.tile}px`);
        const place = (tile) => {
          tiles.set(tile.dataset.key, tile);
          grid.appendChild(tile);
        };
        for (const folder of subfolders()) place(folderTile(folder));
        let group = null;
        for (const item of items()) {
          if (state.scope === 'picks' && item.folder !== group) {
            group = item.folder;
            grid.appendChild(groupHead(group));
          }
          place(fileTile(item));
        }
        if (grid.children.length === 0) {
          grid.appendChild(el('div', 'images-empty', state.scope === 'picks' ? t().emptyPicks : t().emptyFolder));
        }
      }

      // A heading over each folder's picks, with a way to see them in Finder.
      function groupHead(folder) {
        const head = el('div', 'images-group');
        head.dataset.group = folder;
        const name = el('span', 'images-group-name', baseName(folder));
        name.title = folder;
        const count = el('span', 'images-group-count');
        const reveal = el('button', 'images-group-reveal');
        reveal.type = 'button';
        reveal.append(icon('finder', null, 13), el('span', null, s().files.reveal));
        reveal.addEventListener('click', () => {
          const here = state.picks.filter((p) => p.folder === folder).map((p) => p.path);
          files.reveal(here.length ? here : [folder]);
        });
        head.append(name, count, el('span', 'images-spacer'), reveal);
        updateGroupHead(head);
        return head;
      }

      function updateGroupHead(head) {
        const n = state.picks.filter((p) => p.folder === head.dataset.group).length;
        head.querySelector('.images-group-count').textContent = format(t().pickedCount, { count: n });
      }

      function select(key) {
        if (state.selected === key) return;
        const before = tileOf(state.selected);
        if (before) before.classList.remove('current');
        state.selected = key;
        const now = tileOf(key);
        if (now) now.classList.add('current');
        renderPreview();
        scrollToSelected();
      }

      function scrollToSelected() {
        const node = tileOf(state.selected);
        if (node) node.scrollIntoView({ block: 'nearest' });
      }

      // Tiles by key, so marking one among thousands does not search them all.
      const tiles = new Map();
      const tileOf = (key) => tiles.get(key);

      // Read from the grid itself, since a folder heading in the picks view
      // can leave the first row short.
      function gridColumns() {
        const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
        return Math.max(1, columns);
      }

      // ------------------------------------------------ preview

      const preview = createPreview(pane, {
        el,
        icon,
        t,
        format,
        formatBytes,
        isPicked,
        togglePick: (file) => togglePick(file),
        openViewer: (file) => openViewer(file),
        openFolder: (folder) => openFolder(folder),
        // The preview speaks of the one item it shows, picked or not.
        fileStrings: () => s().files,
        reveal: (file) => files.reveal([file]),
        share: (file, anchor) => files.share([file], anchor),
        more: (file) =>
          files.menu({
            kind: 'file',
            paths: [file],
            picked: isPicked(file),
            handlers: {
              openDefault: () => openDefault([file]),
              pick: () => togglePick(file),
              copyTo: () => transfer('copy', [file]),
              moveTo: () => transfer('move', [file]),
              trash: () => trash([file]),
            },
          }),
      });

      function renderPreview() {
        const folder = isFolderKey(state.selected) ? folderOf(state.selected) : null;
        if (folder) return preview.show({ folder }, state.counts.get(folder.path));
        const file = itemOf(state.selected);
        preview.show(file ? { file } : null);
      }

      // ------------------------------------------------ selection

      function failed(outcome) {
        ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
        return false;
      }

      // Every change to the picks goes through here, so each can be undone with
      // ⌘Z and only the tiles it touches are redrawn, leaving thumbnails and a
      // playing video alone.
      async function changePicks(add, remove, options = {}) {
        add = [...new Set(add)].filter((p) => !isFolderKey(p) && !isPicked(p));
        remove = [...new Set(remove)].filter((p) => isPicked(p));
        if (add.length === 0 && remove.length === 0) return false;
        const known = new Map([...items(), ...state.picks].map((i) => [i.path, i]));
        if (add.length) {
          const outcome = await selectCall({ paths: add });
          if (!outcome.ok) return failed(outcome);
        }
        if (remove.length) {
          const outcome = await selectCall({ paths: remove, off: true });
          if (!outcome.ok) return failed(outcome);
        }
        await loadPicks();
        if (options.record !== false) {
          state.history.push({ add, remove });
          if (state.history.length > 200) state.history.shift();
          state.future = [];
        }

        // Viewing the picks, an item picked again that is not on screen, such
        // as one brought back by ⌘Z after leaving and returning, joins its
        // folder's group.
        let redraw = false;
        if (state.scope === 'picks') {
          for (const p of add) {
            if (state.pickView.some((i) => i.path === p)) continue;
            const item = state.picks.find((i) => i.path === p) || known.get(p);
            if (item) {
              state.pickView.push(item);
              redraw = true;
            }
          }
          if (redraw) state.pickView = byFolder(state.pickView);
        }
        if (redraw) renderGrid();
        else {
          for (const p of [...add, ...remove]) {
            const tile = tileOf(p);
            if (tile) markTile(tile);
          }
          for (const head of grid.querySelectorAll('.images-group')) updateGroupHead(head);
        }
        const focused = itemOf(state.selected);
        if (focused) preview.refreshPick(focused);
        renderPickStrip();
        renderStatus();
        if (options.label) ctx.toast(options.label, 'done', options.undoable ? { label: s().undo, run: undoPicks } : undefined);
        return true;
      }

      function togglePick(file) {
        if (!file || isFolderKey(file)) return;
        return isPicked(file) ? changePicks([], [file]) : changePicks([file], []);
      }

      async function undoPicks() {
        const last = state.history.pop();
        if (!last) return;
        if (await changePicks(last.remove, last.add, { record: false })) {
          state.future.push(last);
          ctx.toast(t().pickUndone, 'done');
        }
      }

      async function redoPicks() {
        const next = state.future.pop();
        if (!next) return;
        if (await changePicks(next.add, next.remove, { record: false })) {
          state.history.push(next);
          ctx.toast(t().pickRedone, 'done');
        }
      }

      function selectAllShown() {
        const all = items().map((i) => i.path);
        changePicks(all, [], { label: format(t().allSelected, { count: all.filter((p) => !isPicked(p)).length }), undoable: true });
      }

      function clearPicks() {
        const before = state.picks.map((p) => p.path);
        changePicks([], before, { label: format(t().cleared, { count: before.length }), undoable: true });
      }

      // Files moved or put in the Trash are no longer where earlier pick
      // changes saw them, so those changes can no longer be undone.
      function forgetPickHistory() {
        state.history = [];
        state.future = [];
      }

      function openDefault(paths) {
        for (const p of paths) window.turink.openDefault(p);
      }

      // ------------------------------------------------ right-click and drag

      function tileFromEvent(event) {
        const tile = event.target.closest('.images-tile');
        return tile && grid.contains(tile) ? tile : null;
      }

      gridWrap.addEventListener('contextmenu', (event) => {
        const tile = tileFromEvent(event);
        if (!tile) return;
        event.preventDefault();
        const key = tile.dataset.key;
        if (isFolderKey(key)) {
          select(key);
          files.menu({ kind: 'folder', paths: [folderPath(key)], handlers: { openFolder: () => openFolder(folderPath(key)) } });
          return;
        }
        // Right-clicking outside the picks moves the focus there, so the menu
        // and the preview speak of the same item.
        if (!isPicked(key) || state.picks.length < 2) select(key);
        const paths = targetsOf(key);
        const picked = isPicked(key);
        files.menu({
          kind: 'file',
          paths,
          picked,
          handlers: {
            openViewer: () => openViewer(key),
            openDefault: () => openDefault(paths),
            pick: () => (picked ? changePicks([], paths) : changePicks([key], [])),
            copyTo: () => transfer('copy', paths),
            moveTo: () => transfer('move', paths),
            trash: () => trash(paths),
          },
        });
      });

      // Dragging a tile out hands the files to Finder, Mail or a messenger; a
      // picked tile carries every picked item with it.
      gridWrap.addEventListener('dragstart', (event) => {
        const tile = tileFromEvent(event);
        if (!tile) return;
        event.preventDefault();
        const key = tile.dataset.key;
        files.drag(isFolderKey(key) ? [folderPath(key)] : targetsOf(key));
      });

      // ------------------------------------------------ copy and move

      const recentTargets = () => local.get('recentTargets', []).filter(Boolean).slice(0, 4);

      // With folders used before, the sheet offers them and another folder;
      // without any, it only explains and goes straight to choosing one.
      // The title speaks of the picks when it is the picks that go, and of the
      // file by name when one item is sent from its own menu.
      async function chooseTarget(kind, paths) {
        const count = paths.length;
        const recent = recentTargets();
        const picks = paths.every((p) => isPicked(p));
        const title =
          !picks && count === 1
            ? format(kind === 'copy' ? t().copyTitleOne : t().moveTitleOne, { name: baseName(paths[0]) })
            : format(kind === 'copy' ? t().copyTitle : t().moveTitle, { count });
        const message = kind === 'copy' ? t().copyNote : t().moveNote;
        if (recent.length === 0) {
          const accepted = await ctx.sheet.open({ title, message, accept: t().chooseFolder });
          if (!accepted) return null;
          const chosen = await window.turink.pickPaths(true);
          return chosen && chosen[0] ? chosen[0] : null;
        }
        const choice = el('div', 'images-targets');
        let picked = recent[0] || null;
        const options = [];
        const option = (value, labelText, sub) => {
          const row = el('label', 'images-target');
          const radio = el('input');
          radio.type = 'radio';
          radio.name = 'images-target';
          radio.checked = value === picked;
          radio.addEventListener('change', () => (picked = value));
          row.append(radio, el('span', null, labelText));
          if (sub) row.appendChild(el('span', 'images-target-where', sub));
          options.push(radio);
          return row;
        };
        choice.appendChild(el('div', 'images-targets-head', t().recentTargets));
        for (const target of recent) choice.appendChild(option(target, target.split('/').pop(), target));
        choice.appendChild(option('', t().otherTarget));

        const accepted = await ctx.sheet.open({
          title,
          message,
          body: choice,
          accept: kind === 'copy' ? t().copyAction : t().moveAction,
        });
        if (!accepted) return null;
        if (picked) return picked;
        const chosen = await window.turink.pickPaths(true);
        return chosen && chosen[0] ? chosen[0] : null;
      }

      async function transfer(kind, paths) {
        if (!paths || paths.length === 0) return;
        const to = await chooseTarget(kind, paths);
        if (!to) return;
        local.set('recentTargets', [to, ...recentTargets().filter((p) => p !== to)]);
        const name = to.split('/').pop();
        const outcome = await ctx.run(`images.${kind}`, { paths, to }, { quiet: true });
        if (!outcome.ok) return;
        if (kind === 'copy') {
          // Copied items stay selected in case they go somewhere else too, and
          // the notice offers to let go of them.
          const copied = outcome.result.copied.length;
          const werePicks = paths.every((p) => isPicked(p));
          ctx.toast(format(t().copied, { count: copied, name }), 'done', werePicks ? { label: t().clearSelection, run: clearPicks } : undefined);
          return;
        }
        const moved = outcome.result.moved;
        // Moved items have done their job, so their selection is cleared.
        await selectCall({ paths: moved.map((m) => m.to), off: true });
        forgetPickHistory();
        await refreshAll();
        ctx.toast(format(t().moved, { count: moved.length, name }), 'done', {
          label: s().undo,
          run: async () => {
            const back = new Map();
            for (const m of moved) {
              const folder = m.from.slice(0, m.from.lastIndexOf('/'));
              if (!back.has(folder)) back.set(folder, []);
              back.get(folder).push(m.to);
            }
            for (const [folder, files] of back) await ctx.run('images.move', { paths: files, to: folder }, { quiet: true });
            await selectCall({ paths: moved.map((m) => m.from) });
            await loadPicks();
            await refreshAll();
          },
        });
      }

      // Viewing the picks, the list is gathered again from the selection, so
      // moved or trashed items leave it.
      async function refreshAll() {
        await loadPicks();
        if (state.scope === 'picks') await setScope('picks');
        else if (state.folder) await refresh(state.folder);
        else renderAll();
      }

      // ------------------------------------------------ trash

      async function trash(paths) {
        paths = (Array.isArray(paths) ? paths : [paths]).filter((p) => p && !isFolderKey(p));
        if (paths.length === 0) return;
        const list = items();
        const index = list.findIndex((i) => i.path === state.selected);
        const gone = new Set(paths);
        // For one item the keystroke is the confirmation, as it is for ⌘⌫ in
        // Finder; several, which may include picks from other folders, are
        // listed first. The toast that follows offers the way back.
        const confirm = paths.length === 1 ? { confirm: async () => true } : {};
        const outcome = await ctx.run('images.trash', { paths }, { quiet: true, ...confirm });
        if (!outcome.ok) return;
        forgetPickHistory();
        await refreshAll();
        if (gone.has(state.selected)) {
          const rest = items();
          const next = rest[Math.min(Math.max(index, 0), rest.length - 1)];
          state.selected = next ? next.path : null;
          renderAll();
        }
        const text = paths.length === 1 ? format(t().trashed, { name: paths[0].split('/').pop() }) : format(t().trashedMany, { count: paths.length });
        ctx.toast(text, 'done', {
          label: s().undo,
          run: async () => {
            const restored = await ctx.run('images.restore', { run: outcome.runId }, { quiet: true });
            if (restored.ok) {
              state.selected = paths[0];
              await refreshAll();
            }
          },
        });
      }

      // ------------------------------------------------ viewer

      function openViewer(file) {
        if (!file || isFolderKey(file)) return;
        preview.stop();
        window.turink.openViewer(file, items().map((i) => i.path));
      }

      // The viewer may have selected items or moved some to the Trash, so the
      // list is read again before the last item seen is highlighted.
      async function focusFile(file) {
        await refreshAll();
        if (file && items().some((i) => i.path === file)) select(file);
      }

      // ------------------------------------------------ menus

      // Menus open below a control in the path bar and above one in the
      // status bar, so they never leave the window.
      function menu(anchor, build) {
        closeMenu();
        const box = el('div', 'images-menu');
        box.dataset.menu = '1';
        build(box);
        const a = anchor.getBoundingClientRect();
        const host = root.getBoundingClientRect();
        root.appendChild(box);
        const left = Math.min(a.left - host.left, host.width - box.offsetWidth - 8);
        box.style.left = `${Math.max(8, left)}px`;
        const below = a.bottom - host.top + 6;
        box.style.top = below + box.offsetHeight > host.height ? `${a.top - host.top - box.offsetHeight - 6}px` : `${below}px`;
      }
      function closeMenu() {
        for (const m of root.querySelectorAll('[data-menu]')) m.remove();
      }
      const menuItem = (labelText, onClick, options = {}) => {
        const b = el('button', 'images-menu-item' + (options.on ? ' on' : '') + (options.danger ? ' danger' : ''));
        b.type = 'button';
        if (options.icon) b.appendChild(icon(options.icon, null, 15));
        b.appendChild(el('span', null, labelText));
        if (options.key) b.appendChild(el('span', 'images-menu-key', options.key));
        if (options.on) b.appendChild(icon('check', 'images-menu-check', 14));
        b.addEventListener('click', () => {
          closeMenu();
          onClick();
        });
        return b;
      };

      placeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        menu(placeButton, (box) => {
          box.appendChild(el('div', 'images-menu-head', t().places));
          for (const place of places()) {
            box.appendChild(menuItem(place.name, () => openFolder(place.path), { icon: 'folder' }));
          }
          box.appendChild(el('div', 'images-menu-sep'));
          box.appendChild(
            menuItem(t().otherFolder, async () => {
              const chosen = await window.turink.pickPaths(true);
              if (chosen && chosen[0]) openFolder(chosen[0]);
            })
          );
          box.appendChild(el('div', 'images-menu-sep'));
          box.appendChild(el('div', 'images-menu-tip', t().finderTip));
        });
      });

      function viewMenu(anchor) {
        const set = (view) => window.turink.setImagesView(view).then(setView);
        menu(anchor, (box) => {
          box.appendChild(el('div', 'images-menu-head', t().wheel));
          box.appendChild(menuItem(t().wheelNav, () => set({ wheel: 'nav' }), { on: state.view.wheel === 'nav' }));
          box.appendChild(menuItem(t().wheelZoom, () => set({ wheel: 'zoom' }), { on: state.view.wheel === 'zoom' }));
          box.appendChild(el('div', 'images-menu-sep'));
          box.appendChild(el('div', 'images-menu-head', t().windowSize));
          for (const [value, labelText, hint] of [
            ['first', t().sizeFirst, t().sizeFirstHint],
            ['each', t().sizeEach, t().sizeEachHint],
            ['remember', t().sizeRemember, t().sizeRememberHint],
          ]) {
            const item = menuItem(labelText, () => set({ windowSize: value }), { on: state.view.windowSize === value });
            item.title = hint;
            box.appendChild(item);
          }
          box.appendChild(el('div', 'images-menu-sep'));
          box.appendChild(menuItem(t().defaultApp, defaultAppSheet));
        });
      }

      const outside = (event) => {
        if (!event.target.closest('[data-menu]')) closeMenu();
      };
      document.addEventListener('mousedown', outside);

      function setView(view) {
        state.view = view;
      }

      // ------------------------------------------------ default app

      // macOS asks once per file type before another app becomes the default,
      // so the sheet says so, and offers Finder's own way, which asks nothing.
      async function defaultAppSheet() {
        const app = state.appId ? { app: state.appId } : {};
        const status = await ctx.peek('images.default-app', app);
        const allOurs = status.ok && status.result.allOurs;
        const box = el('div', 'images-default');
        box.appendChild(el('p', null, allOurs ? t().defaultAlready : t().defaultIntro));
        if (!allOurs) {
          const now = el('div', 'images-default-option');
          now.append(el('strong', null, t().defaultNow), el('span', null, t().defaultNowBody));
          const finder = el('div', 'images-default-option');
          const steps = el('ol');
          for (const line of [t().defaultStep1, t().defaultStep2, t().defaultStep3]) steps.appendChild(el('li', null, line));
          finder.append(el('strong', null, t().defaultFinder), steps);
          box.append(now, finder);
        }
        const accepted = await ctx.sheet.open({
          title: t().defaultTitle,
          message: '',
          body: box,
          accept: allOurs ? t().defaultRestore : t().defaultNow,
        });
        if (!accepted) return;
        const outcome = await ctx.run('images.set-default-app', allOurs ? { ...app, restore: true } : app, { quiet: true });
        if (!outcome.ok) return;
        const r = outcome.result;
        if (allOurs) ctx.toast(t().defaultRestored, 'done');
        else ctx.toast(format(r.applied === r.results.length ? t().defaultDone : t().defaultPartly, { applied: r.applied, total: r.results.length }), r.applied ? 'done' : 'error');
      }

      // ------------------------------------------------ keys and gestures

      gridWrap.addEventListener('keydown', (e) => {
        const all = entries();
        const i = all.indexOf(state.selected);
        const cols = gridColumns();
        const move = (delta) => {
          const pos = Math.max(0, Math.min(all.length - 1, (i < 0 ? 0 : i) + delta));
          if (all[pos]) select(all[pos]);
        };
        const k = e.key;
        const openEntry = () => {
          if (isFolderKey(state.selected)) openFolder(state.selected.slice(7));
          else openViewer(state.selected);
        };
        const focusedFile = !isFolderKey(state.selected) && itemOf(state.selected) ? state.selected : null;
        const focusedPaths = focusedFile ? targetsOf(focusedFile) : isFolderKey(state.selected) ? [folderPath(state.selected)] : [];
        // By key position, so a Korean input source still reaches ⌘A, ⌘Z and
        // the rest.
        if (e.metaKey && e.code === 'KeyZ') {
          if (e.shiftKey) redoPicks();
          else undoPicks();
        } else if (e.metaKey && e.code === 'KeyA') selectAllShown();
        else if (e.metaKey && e.altKey && e.code === 'KeyC') {
          if (focusedPaths.length) files.copyPath(focusedPaths);
        } else if (e.metaKey && e.code === 'KeyC') {
          if (focusedPaths.length) files.copy(focusedPaths);
        } else if (e.metaKey && e.altKey && e.code === 'KeyR') {
          if (focusedPaths.length) files.reveal(focusedPaths);
        } else if (e.metaKey && k === 'ArrowUp') {
          if (state.scope === 'folder' && state.listing && state.listing.parent) openFolder(state.listing.parent, folderKey(state.folder));
        } else if (e.metaKey && k === 'ArrowDown') openEntry();
        else if (e.metaKey && k === 'Backspace') {
          if (focusedFile) trash(targetsOf(focusedFile));
        }
        else if (k === 'ArrowRight') move(1);
        else if (k === 'ArrowLeft') move(-1);
        else if (k === 'ArrowDown') move(cols);
        else if (k === 'ArrowUp') move(-cols);
        else if (k === 'Enter') openEntry();
        else if (k === ' ') {
          if (!isFolderKey(state.selected)) openViewer(state.selected);
        }
        // By key position, so a Korean input source does not turn P into "ㅔ".
        else if (e.code === 'KeyP' && !e.metaKey) togglePick(state.selected);
        else return;
        e.preventDefault();
      });

      // Pinching the grid changes the thumbnail size, as it does in Photos.
      gridWrap.addEventListener(
        'wheel',
        (e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setTile(state.tile * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.003)));
        },
        { passive: false }
      );

      let tileTimer = null;
      function setTile(value) {
        state.tile = Math.round(Math.max(88, Math.min(220, value)));
        const range = statusBar.querySelector('input[type="range"]');
        if (range) range.value = String(state.tile);
        grid.style.setProperty('--tile', `${state.tile}px`);
        clearTimeout(tileTimer);
        tileTimer = setTimeout(() => {
          local.set('tile', state.tile);
          // Thumbnails already shown are asked again only when the tile has
          // outgrown them, so dragging the slider does not reload the grid.
          for (const img of grid.querySelectorAll('img[data-step]')) {
            if (step(img.dataset.mosaic ? state.tile / 2 : state.tile) > Number(img.dataset.step)) loadThumb(img);
          }
        }, 300);
      }

      splitter.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = pane.getBoundingClientRect().width;
        const moveTo = (m) => {
          pane.style.width = `${Math.max(260, Math.min(body.clientWidth * 0.7, startW - (m.clientX - startX)))}px`;
        };
        const up = () => {
          local.set('previewWidth', Math.round(pane.getBoundingClientRect().width));
          document.removeEventListener('mousemove', moveTo);
          document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', moveTo);
        document.addEventListener('mouseup', up);
      });

      // ------------------------------------------------ start

      function renderAll() {
        renderToolbar();
        renderPickStrip();
        renderGrid();
        renderStatus();
        renderPreview();
      }

      active = { openFolder, refresh, focusFile, setView };
      this.unmount = () => {
        active = null;
        counting++;
        seen.disconnect();
        preview.stop();
        document.removeEventListener('mousedown', outside);
        window.turink.watchImagesFolder(null);
      };

      (async () => {
        state.view = await window.turink.imagesView();
        await loadPicks();
        const initial = await window.turink.imagesInitial();
        state.home = initial.home;
        state.appId = initial.appId;
        await openFolder(initial.folder);
      })();
    },
  });
})();
