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
      const state = {
        folder: null,
        home: null,
        appId: null,
        listing: null,
        counts: new Map(),
        picks: [],
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

      const items = () => (state.scope === 'picks' ? state.picks : state.listing ? state.listing.images : []);
      const subfolders = () => (state.scope === 'folder' && state.listing ? state.listing.folders : []);
      const entries = () => [...subfolders().map((f) => folderKey(f.path)), ...items().map((i) => i.path)];
      const isPicked = (file) => state.picks.some((p) => p.path === file);
      const baseName = (file) => file.split('/').filter(Boolean).pop() || file;
      const itemOf = (key) => items().find((i) => i.path === key);
      const folderOf = (key) => subfolders().find((f) => folderKey(f.path) === key);

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
        if (scope === 'picks') await loadPicks();
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
        b.append(icon(iconName, null, 14), el('span', 'images-strip-label', label));
        b.addEventListener('click', onClick);
        return b;
      }

      function renderPickStrip() {
        pickStrip.textContent = '';
        pickStrip.hidden = state.picks.length === 0;
        if (pickStrip.hidden) return;
        const clear = el('button', 'images-strip-clear');
        clear.type = 'button';
        tip(clear, t().clearSelection);
        clear.appendChild(icon('close', null, 14));
        clear.addEventListener('click', clearPicks);
        const only = el('button', 'images-strip-only' + (state.scope === 'picks' ? ' on' : ''));
        only.type = 'button';
        tip(only, t().showPicked);
        only.setAttribute('aria-pressed', String(state.scope === 'picks'));
        only.append(icon('filter', null, 13), el('span', 'images-strip-label', t().showPicked));
        only.addEventListener('click', () => setScope(state.scope === 'picks' ? 'folder' : 'picks'));
        pickStrip.append(
          clear,
          el('span', 'images-strip-count', format(t().pickedCount, { count: state.picks.length })),
          only,
          el('span', 'images-spacer'),
          stripButton('copy', t().copyShort, t().copyTip, () => transfer('copy')),
          stripButton('move', t().moveShort, t().moveTip, () => transfer('move'))
        );
      }

      // ------------------------------------------------ status bar

      function renderStatus() {
        statusBar.textContent = '';
        const files = items();
        const tally = { photo: 0, video: 0, pdf: 0 };
        for (const f of files) tally[f.type] = (tally[f.type] || 0) + 1;
        const parts = [];
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
        tile.append(folderThumb(folder), el('div', 'images-tile-name', folder.name), el('div', 'images-tile-sub', folderSub(folder)));
        tile.addEventListener('mousedown', () => select(key));
        tile.addEventListener('dblclick', () => openFolder(folder.path));
        return tile;
      }

      function updateFolderTile(path) {
        const folder = subfolders().find((f) => f.path === path);
        const old = folder && [...grid.children].find((tile) => tile.dataset.key === folderKey(path));
        if (old) old.replaceWith(folderTile(folder));
      }

      function badge(item) {
        if (item.type === 'pdf') return el('span', 'images-badge', 'PDF');
        if (item.type !== 'video') return null;
        const b = el('span', 'images-badge');
        b.append(icon('play', null, 9));
        // The length comes from Spotlight. A folder it does not index, such as
        // a Google Drive one, is asked of the player instead, which reads only
        // the part of the file that holds it.
        window.turink.imageFacts(item.path).then((f) => {
          if (f && f.duration) return b.appendChild(document.createTextNode(clock(f.duration)));
          const probe = document.createElement('video');
          probe.preload = 'metadata';
          probe.muted = true;
          probe.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(probe.duration)) b.appendChild(document.createTextNode(clock(probe.duration)));
            probe.removeAttribute('src');
            probe.load();
          });
          probe.src = window.TurinkImagesPreview.fileURL(item.path);
        });
        return b;
      }

      function fileTile(item) {
        const tile = el('div', 'images-tile' + (item.path === state.selected ? ' current' : '') + (isPicked(item.path) ? ' picked' : ''));
        tile.dataset.key = item.path;
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
          togglePick(item.path);
        });
        tile.append(thumb, pick, el('div', 'images-tile-name', item.name));
        if (state.scope === 'picks') tile.append(el('div', 'images-tile-sub', baseName(item.folder)));
        tile.addEventListener('mousedown', () => select(item.path));
        tile.addEventListener('dblclick', () => openViewer(item.path));
        return tile;
      }

      function renderGrid() {
        seen.disconnect();
        grid.textContent = '';
        grid.style.setProperty('--tile', `${state.tile}px`);
        for (const folder of subfolders()) grid.appendChild(folderTile(folder));
        for (const item of items()) grid.appendChild(fileTile(item));
        if (grid.children.length === 0) {
          grid.appendChild(el('div', 'images-empty', state.scope === 'picks' ? t().emptyPicks : t().emptyFolder));
        }
      }

      function select(key) {
        if (state.selected === key) return;
        state.selected = key;
        for (const tile of grid.children) tile.classList.toggle('current', tile.dataset.key === key);
        renderPreview();
        scrollToSelected();
      }

      function scrollToSelected() {
        const node = [...grid.children].find((tile) => tile.dataset.key === state.selected);
        if (node) node.scrollIntoView({ block: 'nearest' });
      }

      function gridColumns() {
        const tiles = [...grid.children];
        if (tiles.length < 2) return 1;
        const top = tiles[0].offsetTop;
        const index = tiles.findIndex((tile) => tile.offsetTop !== top);
        return index === -1 ? tiles.length : index;
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
      });

      function renderPreview() {
        const folder = isFolderKey(state.selected) ? folderOf(state.selected) : null;
        if (folder) return preview.show({ folder }, state.counts.get(folder.path));
        const file = itemOf(state.selected);
        preview.show(file ? { file } : null);
      }

      // ------------------------------------------------ selection

      async function togglePick(file) {
        if (!file || isFolderKey(file)) return;
        const off = isPicked(file);
        const outcome = await selectCall({ paths: [file], off });
        if (!outcome.ok) {
          ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
          return;
        }
        await loadPicks();
        if (state.scope === 'picks' && off) {
          const left = items();
          if (!left.some((i) => i.path === state.selected)) state.selected = left[0] ? left[0].path : null;
          if (left.length === 0) return setScope('folder');
          return renderAll();
        }
        // Only what the pick changes is redrawn, so thumbnails and a playing
        // video are left alone.
        const tile = [...grid.children].find((node) => node.dataset.key === file);
        if (tile) tile.classList.toggle('picked', isPicked(file));
        const item = itemOf(file);
        if (item) preview.refreshPick(item);
        renderPickStrip();
      }

      async function clearPicks() {
        const before = state.picks.map((p) => p.path);
        await selectCall({ clear: true });
        await loadPicks();
        if (state.scope === 'picks') await setScope('folder');
        else renderAll();
        ctx.toast(format(t().cleared, { count: before.length }), 'done', {
          label: s().undo,
          run: async () => {
            await selectCall({ paths: before });
            await loadPicks();
            renderAll();
          },
        });
      }

      // ------------------------------------------------ copy and move

      const recentTargets = () => local.get('recentTargets', []).filter(Boolean).slice(0, 4);

      // With folders used before, the sheet offers them and another folder;
      // without any, it only explains and goes straight to choosing one.
      async function chooseTarget(kind) {
        const count = state.picks.length;
        const recent = recentTargets();
        const title = format(kind === 'copy' ? t().copyTitle : t().moveTitle, { count });
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

      async function transfer(kind) {
        const paths = state.picks.map((p) => p.path);
        if (paths.length === 0) return;
        const to = await chooseTarget(kind);
        if (!to) return;
        local.set('recentTargets', [to, ...recentTargets().filter((p) => p !== to)]);
        const name = to.split('/').pop();
        const outcome = await ctx.run(`images.${kind}`, { paths, to }, { quiet: true });
        if (!outcome.ok) return;
        if (kind === 'copy') {
          // Copied items stay selected in case they go somewhere else too.
          const copied = outcome.result.copied.length;
          ctx.toast(format(t().copied, { count: copied, name }), 'done', {
            label: t().clearSelection,
            run: async () => {
              await selectCall({ clear: true });
              await loadPicks();
              if (state.scope === 'picks') await setScope('folder');
              else renderAll();
            },
          });
          return;
        }
        const moved = outcome.result.moved;
        // Moved items have done their job, so their selection is cleared.
        await selectCall({ paths: moved.map((m) => m.to), off: true });
        await loadPicks();
        if (state.scope === 'picks' && state.picks.length === 0) await setScope('folder');
        else await refreshAll();
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

      async function refreshAll() {
        if (state.folder) await refresh(state.folder);
        else renderAll();
      }

      // ------------------------------------------------ trash

      async function trash(file) {
        if (!file || isFolderKey(file)) return;
        const list = items();
        const index = list.findIndex((i) => i.path === file);
        const name = file.split('/').pop();
        // The keystroke is the confirmation, as it is for ⌘⌫ in Finder; the
        // toast that follows offers the way back.
        const outcome = await ctx.run('images.trash', { paths: [file] }, { quiet: true, confirm: async () => true });
        if (!outcome.ok) return;
        await loadPicks();
        if (state.scope === 'folder') await refresh(state.folder);
        const rest = items();
        state.selected = rest[Math.min(index, rest.length - 1)] ? rest[Math.min(index, rest.length - 1)].path : null;
        renderAll();
        ctx.toast(format(t().trashed, { name }), 'done', {
          label: s().undo,
          run: async () => {
            const restored = await ctx.run('images.restore', { run: outcome.runId }, { quiet: true });
            if (restored.ok) {
              state.selected = file;
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
        await loadPicks();
        if (state.scope === 'folder' && state.folder) await refresh(state.folder);
        else renderAll();
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
        const b = el('button', 'images-menu-item' + (options.on ? ' on' : ''));
        b.type = 'button';
        if (options.icon) b.appendChild(icon(options.icon, null, 15));
        b.appendChild(el('span', null, labelText));
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
        if (e.metaKey && k === 'ArrowUp') {
          if (state.scope === 'folder' && state.listing && state.listing.parent) openFolder(state.listing.parent, folderKey(state.folder));
        } else if (e.metaKey && k === 'ArrowDown') openEntry();
        else if (e.metaKey && k === 'Backspace') trash(state.selected);
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
