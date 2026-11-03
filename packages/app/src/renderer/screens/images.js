'use strict';

// Photos in a folder: subfolders and thumbnails on the left, the chosen photo
// large on the right, and the photos a person selected gathered across folders.
// Reading a folder, selecting and copying or moving all go through images.*
// tasks, so the command line and an agent see the same folders and the same
// selection. Double-clicking a photo opens the viewer window.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  const thumbURL = (file, size) =>
    `turink-thumb://t/${encodeURIComponent(file)}?s=${Math.round(size * (window.devicePixelRatio || 1))}`;
  const imageURL = (file) => `turink-image://f/${encodeURIComponent(file)}`;
  const folderKey = (file) => `folder:${file}`;
  const isFolderKey = (key) => typeof key === 'string' && key.startsWith('folder:');

  // Conveniences kept per window rather than as settings shared with the
  // command line: how large the thumbnails are and where photos were sent.
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
    tasks: ['images.list', 'images.selected', 'images.select', 'images.copy', 'images.move', 'images.trash', 'images.restore'],

    mount(root, ctx) {
      const { el, icon, s, format, formatBytes } = ctx;
      const t = () => s().images;
      const state = {
        folder: null,
        home: null,
        listing: null,
        picks: [],
        scope: 'folder',
        selected: null,
        tile: local.get('tile', 132),
        view: { wheel: 'nav', windowSize: 'first' },
      };

      // ------------------------------------------------ layout

      const toolbar = el('div', 'images-toolbar');
      const placeButton = el('button', 'images-place');
      placeButton.type = 'button';
      placeButton.title = t().openFolder;
      placeButton.setAttribute('aria-label', t().openFolder);
      placeButton.append(icon('folder', null, 16), icon('chevron-down', null, 13));
      const crumbs = el('div', 'images-crumbs');
      const sizeRange = el('input', 'images-size');
      sizeRange.type = 'range';
      sizeRange.min = '88';
      sizeRange.max = '220';
      sizeRange.value = String(state.tile);
      sizeRange.title = t().thumbSize;
      sizeRange.setAttribute('aria-label', t().thumbSize);
      const viewButton = el('button', 'icon-button');
      viewButton.type = 'button';
      viewButton.title = t().viewSettings;
      viewButton.setAttribute('aria-label', t().viewSettings);
      viewButton.appendChild(icon('sliders'));
      toolbar.append(placeButton, crumbs, el('span', 'images-spacer'), sizeRange, viewButton);

      const body = el('div', 'images-body');
      const gridColumn = el('div', 'images-grid-column');
      const gridWrap = el('div', 'images-grid-wrap');
      gridWrap.tabIndex = 0;
      const grid = el('div', 'images-grid');
      gridWrap.appendChild(grid);
      const pickBar = el('div', 'images-pick-bar');
      pickBar.hidden = true;
      gridColumn.append(gridWrap, pickBar);
      const splitter = el('div', 'images-splitter');
      const preview = el('aside', 'images-preview');
      preview.style.width = `${local.get('previewWidth', 380)}px`;
      body.append(gridColumn, splitter, preview);
      root.append(toolbar, body);

      // ------------------------------------------------ data

      const images = () =>
        state.scope === 'picks' ? state.picks : state.listing ? state.listing.images : [];
      const subfolders = () => (state.scope === 'folder' && state.listing ? state.listing.folders : []);
      const entries = () => [...subfolders().map((f) => folderKey(f.path)), ...images().map((i) => i.path)];
      const isPicked = (file) => state.picks.some((p) => p.path === file);
      const baseName = (file) => file.split('/').filter(Boolean).pop() || file;

      // The path is read from the home folder down when it lies inside it, as
      // Finder's path bar does, and from the disk otherwise.
      function trail(folder) {
        const home = state.home;
        if (home && (folder === home || folder.startsWith(`${home}/`))) {
          const parts = [{ name: s().folders.placeHome, path: home }];
          let at = home;
          for (const name of folder.slice(home.length).split('/').filter(Boolean)) {
            at = `${at}/${name}`;
            parts.push({ name, path: at });
          }
          return parts;
        }
        const parts = [{ name: s().folders.placeDisk, path: '/' }];
        let at = '';
        for (const name of folder.split('/').filter(Boolean)) {
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

      async function openFolder(folder, focus) {
        const outcome = await ctx.peek('images.list', { folder });
        if (!outcome.ok) {
          ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
          return;
        }
        state.scope = 'folder';
        state.folder = outcome.result.folder;
        state.listing = outcome.result;
        window.turink.rememberImagesFolder(state.folder);
        window.turink.watchImagesFolder(state.folder);
        const list = entries();
        state.selected = focus && list.includes(focus) ? focus : images()[0] ? images()[0].path : list[0] || null;
        renderAll();
        gridWrap.scrollTop = 0;
        scrollToSelected();
        gridWrap.focus();
      }

      async function refresh(folder) {
        if (folder !== state.folder) return;
        const outcome = await ctx.peek('images.list', { folder });
        if (!outcome.ok) return;
        state.listing = outcome.result;
        if (!entries().includes(state.selected)) state.selected = entries()[0] || null;
        renderAll();
      }

      async function setScope(scope) {
        state.scope = scope;
        if (scope === 'picks') await loadPicks();
        const list = entries();
        if (!list.includes(state.selected)) state.selected = images()[0] ? images()[0].path : list[0] || null;
        renderAll();
        gridWrap.focus();
      }

      // ------------------------------------------------ toolbar

      function renderToolbar() {
        crumbs.textContent = '';
        placeButton.hidden = state.scope === 'picks';
        if (state.scope === 'picks') {
          const back = el('button', 'images-back');
          back.type = 'button';
          back.title = t().backToFolder;
          back.append(icon('chevron', 'images-back-icon', 14), el('span', null, state.folder ? baseName(state.folder) : ''));
          back.addEventListener('click', () => setScope('folder'));
          crumbs.append(back, el('span', 'images-view-title', format(t().picksTitle, { count: images().length })));
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

      // ------------------------------------------------ grid

      // Thumbnails load as their tiles scroll into view, so a folder of
      // thousands of photos opens at once.
      const seen = new IntersectionObserver(
        (records) => {
          for (const record of records) {
            if (!record.isIntersecting) continue;
            const img = record.target;
            img.src = thumbURL(img.dataset.file, state.tile);
            seen.unobserve(img);
          }
        },
        { root: gridWrap, rootMargin: '300px' }
      );

      function pickDot(size) {
        const dot = el('span', 'images-pick-dot');
        dot.appendChild(icon('check', null, size || 12));
        return dot;
      }

      function renderGrid() {
        seen.disconnect();
        grid.textContent = '';
        grid.style.setProperty('--tile', `${state.tile}px`);
        for (const folder of subfolders()) {
          const key = folderKey(folder.path);
          const tile = el('div', 'images-tile' + (key === state.selected ? ' current' : ''));
          tile.dataset.key = key;
          const thumb = el('div', 'images-thumb folder');
          thumb.appendChild(icon('folder', null, 56));
          tile.append(thumb, el('div', 'images-tile-name', folder.name), el('div', 'images-tile-sub', format(t().photoCount, { count: folder.images })));
          tile.addEventListener('mousedown', () => select(key));
          tile.addEventListener('dblclick', () => openFolder(folder.path));
          grid.appendChild(tile);
        }
        for (const image of images()) {
          const tile = el('div', 'images-tile' + (image.path === state.selected ? ' current' : ''));
          tile.dataset.key = image.path;
          const thumb = el('div', 'images-thumb');
          const img = el('img');
          img.alt = '';
          img.draggable = false;
          img.dataset.file = image.path;
          img.addEventListener('error', () => img.classList.add('missing'));
          seen.observe(img);
          thumb.appendChild(img);
          tile.append(thumb, el('div', 'images-tile-name', image.name));
          if (state.scope === 'picks') tile.append(el('div', 'images-tile-sub', baseName(image.folder)));
          if (isPicked(image.path)) tile.appendChild(pickDot());
          tile.addEventListener('mousedown', () => select(image.path));
          tile.addEventListener('dblclick', () => openViewer(image.path));
          grid.appendChild(tile);
        }
        if (grid.children.length === 0) {
          grid.appendChild(el('div', 'images-empty', state.scope === 'picks' ? t().emptyPicks : t().emptyFolder));
        }
      }

      function select(key) {
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

      function fact(list, label, value) {
        list.append(el('dt', null, label), el('dd', null, value));
      }

      function renderPreview() {
        preview.textContent = '';
        const stage = el('div', 'images-preview-stage');
        preview.appendChild(stage);
        const info = el('div', 'images-preview-info');
        const facts = el('dl', 'images-facts');
        const actions = el('div', 'images-actions');

        if (isFolderKey(state.selected)) {
          const folder = subfolders().find((f) => folderKey(f.path) === state.selected);
          if (!folder) return;
          const big = icon('folder', 'images-preview-folder', 110);
          stage.appendChild(big);
          stage.addEventListener('dblclick', () => openFolder(folder.path));
          info.appendChild(el('div', 'images-preview-name', folder.name));
          fact(facts, t().photos, format(t().photoCount, { count: folder.images }));
          const open = el('button', 'button primary');
          open.type = 'button';
          open.append(icon('folder', null, 15), el('span', null, t().openFolderButton), el('span', 'kbd', '↵'));
          open.addEventListener('click', () => openFolder(folder.path));
          actions.appendChild(open);
          info.append(facts, actions);
          preview.appendChild(info);
          return;
        }

        const image = images().find((i) => i.path === state.selected);
        if (!image) {
          stage.appendChild(el('div', 'images-empty', t().previewEmpty));
          return;
        }
        const img = el('img');
        img.alt = '';
        img.draggable = false;
        img.src = thumbURL(image.path, 512);
        const full = new Image();
        full.onload = () => {
          if (state.selected !== image.path) return;
          img.src = full.src;
          dims.textContent = `${full.naturalWidth} × ${full.naturalHeight}`;
        };
        full.src = imageURL(image.path);
        img.addEventListener('dblclick', () => openViewer(image.path));
        stage.appendChild(img);

        info.appendChild(el('div', 'images-preview-name', image.name));
        const dims = el('span', null, '…');
        facts.append(el('dt', null, t().dimensions), el('dd', null));
        facts.lastChild.appendChild(dims);
        if (image.bytes !== undefined) fact(facts, t().fileSize, formatBytes(image.bytes));
        if (image.modified) fact(facts, t().modified, new Date(image.modified).toLocaleString());
        fact(facts, t().location, image.folder || state.folder);

        const picked = isPicked(image.path);
        const pick = el('button', 'button' + (picked ? ' on' : ''));
        pick.type = 'button';
        pick.setAttribute('aria-pressed', String(picked));
        if (picked) pick.title = t().selectedHint;
        pick.append(icon(picked ? 'check' : 'pick', null, 15), el('span', null, picked ? t().selected : t().select), el('span', 'kbd', 'P'));
        pick.addEventListener('click', () => togglePick(image.path));
        const open = el('button', 'button primary');
        open.type = 'button';
        open.append(icon('external', null, 15), el('span', null, t().openViewer), el('span', 'kbd', '↵'));
        open.addEventListener('click', () => openViewer(image.path));
        actions.append(pick, open);
        info.append(facts, actions);
        preview.appendChild(info);
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
          const list = images();
          if (!list.some((i) => i.path === state.selected)) state.selected = list[0] ? list[0].path : null;
        }
        renderAll();
      }

      function renderPickBar() {
        pickBar.textContent = '';
        const count = state.picks.length;
        pickBar.hidden = count === 0;
        if (pickBar.hidden) return;
        const label = el('span', 'images-pick-label');
        label.append(t().pickBar, ' ', el('strong', null, format(t().pickCount, { count })));
        pickBar.appendChild(label);
        if (state.scope !== 'picks') {
          const gather = el('button', 'text-button', t().gather);
          gather.type = 'button';
          gather.addEventListener('click', () => setScope('picks'));
          pickBar.appendChild(gather);
        }
        const copy = el('button', 'button small');
        copy.type = 'button';
        copy.append(icon('copy', null, 14), el('span', null, t().copy));
        copy.addEventListener('click', () => transfer('copy'));
        const move = el('button', 'button small');
        move.type = 'button';
        move.append(icon('folder', null, 14), el('span', null, t().move));
        move.addEventListener('click', () => transfer('move'));
        const clear = el('button', 'text-button', t().clearSelection);
        clear.type = 'button';
        clear.addEventListener('click', clearPicks);
        pickBar.append(copy, move, clear);
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

      async function chooseTarget(kind) {
        const count = state.picks.length;
        const recent = recentTargets();
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
        if (recent.length > 0) {
          choice.appendChild(el('div', 'images-targets-head', t().recentTargets));
          for (const target of recent) choice.appendChild(option(target, target.split('/').pop(), target));
        }
        choice.appendChild(option('', t().otherFolder));
        if (!picked && options.length) options[options.length - 1].checked = true;
        choice.appendChild(el('p', 'images-target-note', kind === 'copy' ? t().copyNote : t().moveNote));

        const accepted = await ctx.sheet.open({
          title: format(kind === 'copy' ? t().copyTitle : t().moveTitle, { count }),
          message: '',
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
        // Moved photos have done their job, so their selection is cleared.
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
        const list = images();
        const index = list.findIndex((i) => i.path === file);
        const name = file.split('/').pop();
        // The keystroke is the confirmation, as it is for ⌘⌫ in Finder; the
        // toast that follows offers the way back.
        const outcome = await ctx.run('images.trash', { paths: [file] }, { quiet: true, confirm: async () => true });
        if (!outcome.ok) return;
        await loadPicks();
        if (state.scope === 'folder') await refresh(state.folder);
        const rest = images();
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
        window.turink.openViewer(file, images().map((i) => i.path));
      }

      // The viewer may have selected photos or moved some to the Trash, so the
      // list is read again before the last photo seen is highlighted.
      async function focusFile(file) {
        await loadPicks();
        if (state.scope === 'folder' && state.folder) await refresh(state.folder);
        else renderAll();
        if (file && images().some((i) => i.path === file)) select(file);
      }

      // ------------------------------------------------ menus

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
        box.style.top = `${a.bottom - host.top + 6}px`;
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

      viewButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const set = (view) => window.turink.setImagesView(view).then(setView);
        menu(viewButton, (box) => {
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
          box.appendChild(el('div', 'images-menu-tip', { first: t().sizeFirstHint, each: t().sizeEachHint, remember: t().sizeRememberHint }[state.view.windowSize]));
        });
      });

      const outside = (event) => {
        if (!event.target.closest('[data-menu]')) closeMenu();
      };
      document.addEventListener('mousedown', outside);

      function setView(view) {
        state.view = view;
      }

      // ------------------------------------------------ keys and gestures

      gridWrap.addEventListener('keydown', (e) => {
        const list = entries();
        const i = list.indexOf(state.selected);
        const cols = gridColumns();
        const move = (delta) => {
          const pos = Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + delta));
          if (list[pos]) select(list[pos]);
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
      sizeRange.addEventListener('input', () => setTile(Number(sizeRange.value)));

      let tileTimer = null;
      function setTile(value) {
        state.tile = Math.round(Math.max(88, Math.min(220, value)));
        sizeRange.value = String(state.tile);
        grid.style.setProperty('--tile', `${state.tile}px`);
        clearTimeout(tileTimer);
        tileTimer = setTimeout(() => local.set('tile', state.tile), 300);
      }

      splitter.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = preview.getBoundingClientRect().width;
        const moveTo = (m) => {
          preview.style.width = `${Math.max(260, Math.min(body.clientWidth * 0.7, startW - (m.clientX - startX)))}px`;
        };
        const up = () => {
          local.set('previewWidth', Math.round(preview.getBoundingClientRect().width));
          document.removeEventListener('mousemove', moveTo);
          document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', moveTo);
        document.addEventListener('mouseup', up);
      });

      // ------------------------------------------------ start

      function renderAll() {
        renderToolbar();
        renderGrid();
        renderPreview();
        renderPickBar();
      }

      active = { openFolder, refresh, focusFile, setView };
      this.unmount = () => {
        active = null;
        seen.disconnect();
        document.removeEventListener('mousedown', outside);
        window.turink.watchImagesFolder(null);
      };

      (async () => {
        state.view = await window.turink.imagesView();
        await loadPicks();
        const initial = await window.turink.imagesInitial();
        state.home = initial.home;
        await openFolder(initial.folder);
      })();
    },
  });
})();
