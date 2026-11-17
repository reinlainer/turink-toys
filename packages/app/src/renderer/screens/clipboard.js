'use strict';

// The images kept from the clipboard, the last day above the rest. Nothing
// leaves this gallery on its own: the person selects what to remove. ⌘C puts
// the selection back on the clipboard as images, which is the point of keeping
// them, so a screenshot can be pasted again without a file ever being saved.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);
  const { thumbURL } = window.TurinkImagesPreview;

  // The screen on display, if this is it. Folder changes arrive whichever
  // screen is showing and only matter here.
  let active = null;
  window.turink.onClipboardChanged(() => active && active.reload());

  // The split between the last day and older moves with the clock, so an open
  // screen sorts itself again now and then.
  const RESORT_MS = 5 * 60 * 1000;

  screens.push({
    id: 'clipboard',
    icon: 'clipboard',
    tasks: ['clipboard.list', 'clipboard.copy', 'clipboard.save', 'clipboard.collect'],

    mount(root, ctx) {
      const { el, icon, s, format } = ctx;
      const t = () => s().clipboard;
      const state = { listing: null, selected: new Set(), anchor: null, focus: null };

      root.appendChild(ctx.header(s().nav.clipboard, t().subtitle));

      // ------------------------------------------------ collection switch

      const card = el('section', 'card setting-card clip-setting');
      const head = el('div', 'setting-head');
      const text = el('div', 'setting-text');
      text.appendChild(el('h2', null, t().collect));
      text.appendChild(el('p', null, t().collectNote));
      text.appendChild(el('p', 'clip-tip', t().tip));
      head.appendChild(text);
      const side = el('div', 'clip-setting-side');
      const toggle = el('input', 'switch');
      toggle.type = 'checkbox';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', t().collect);
      side.appendChild(toggle);
      head.appendChild(side);
      card.appendChild(head);
      root.appendChild(card);

      // The switch shows what the core reports back, not the click, so a
      // failed change leaves it where it was.
      toggle.addEventListener('change', async () => {
        const wanted = toggle.checked;
        toggle.disabled = true;
        const outcome = await ctx.peek('clipboard.collect', { on: wanted });
        toggle.disabled = false;
        if (!outcome.ok) ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
        await reload();
      });

      // ------------------------------------------------ gallery

      const gallery = el('div', 'clip-gallery');
      gallery.tabIndex = 0;
      root.appendChild(gallery);

      const bar = el('div', 'clip-bar');
      const count = el('span', 'clip-bar-count');
      const reveal = el('button', 'button small', t().openFolder);
      reveal.type = 'button';
      const copyButton = el('button', 'button small', t().copy);
      copyButton.type = 'button';
      const trashButton = el('button', 'button small danger-text', t().trash);
      trashButton.type = 'button';
      bar.append(count, el('span', 'clip-bar-hint', t().hint), reveal, copyButton, trashButton);
      root.appendChild(bar);

      reveal.addEventListener('click', () => state.listing && window.turink.reveal(state.listing.folder));
      copyButton.addEventListener('click', () => copySelected());
      trashButton.addEventListener('click', () => trashSelected());

      const items = () => (state.listing ? [...state.listing.recent, ...state.listing.older] : []);
      const order = () => items().map((item) => item.path);
      const selectedPaths = () => order().filter((p) => state.selected.has(p));

      function timeLabel(item, recent) {
        const date = new Date(item.saved);
        return recent ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ctx.relativeTime(item.saved);
      }

      function tile(item, recent) {
        const box = el('div', 'clip-tile');
        box.dataset.path = item.path;
        box.draggable = true;
        box.title = item.name;
        const thumb = el('div', 'clip-thumb');
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = thumbURL(item.path, 220);
        img.addEventListener('error', () => img.classList.add('missing'));
        thumb.appendChild(img);
        const check = el('span', 'clip-check');
        check.appendChild(icon('check'));
        thumb.appendChild(check);
        box.appendChild(thumb);
        box.appendChild(el('span', 'clip-time', timeLabel(item, recent)));
        return box;
      }

      function section(title, list, recent) {
        if (list.length === 0) return;
        const group = el('div', 'clip-group');
        group.appendChild(el('span', 'clip-group-name', title));
        group.appendChild(el('span', 'clip-group-count', String(list.length)));
        gallery.appendChild(group);
        const grid = el('div', 'clip-grid');
        for (const item of list) grid.appendChild(tile(item, recent));
        gallery.appendChild(grid);
      }

      function render() {
        const listing = state.listing;
        toggle.checked = Boolean(listing && listing.collecting);
        card.classList.toggle('active', toggle.checked);
        gallery.textContent = '';
        if (!listing) return;
        if (items().length === 0) {
          gallery.appendChild(el('p', 'clip-empty', listing.collecting ? t().emptyOn : t().emptyOff));
        } else {
          section(t().recent, listing.recent, true);
          section(t().older, listing.older, false);
        }
        paintSelection();
      }

      function paintSelection() {
        for (const box of gallery.querySelectorAll('.clip-tile')) {
          box.classList.toggle('selected', state.selected.has(box.dataset.path));
          box.classList.toggle('current', box.dataset.path === state.focus);
        }
        const n = state.selected.size;
        count.textContent = n ? format(t().selection, { count: n }) : '';
        copyButton.disabled = n === 0;
        trashButton.disabled = n === 0;
        bar.classList.toggle('has-selection', n > 0);
      }

      // Images removed elsewhere drop out of the selection; the rest stay
      // selected across a reload.
      async function reload() {
        const outcome = await ctx.peek('clipboard.list');
        if (!outcome.ok) {
          ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
          return;
        }
        state.listing = outcome.result;
        const present = new Set(order());
        for (const p of [...state.selected]) if (!present.has(p)) state.selected.delete(p);
        if (state.focus && !present.has(state.focus)) state.focus = null;
        if (state.anchor && !present.has(state.anchor)) state.anchor = null;
        render();
      }

      // ------------------------------------------------ selection

      function selectOnly(p) {
        state.selected = new Set(p ? [p] : []);
        state.focus = p;
        state.anchor = p;
      }

      function selectRange(p) {
        const list = order();
        const from = list.indexOf(state.anchor || p);
        const to = list.indexOf(p);
        const [a, b] = from < to ? [from, to] : [to, from];
        state.selected = new Set(list.slice(a, b + 1));
        state.focus = p;
      }

      const tileOf = (event) => event.target.closest && event.target.closest('.clip-tile');

      gallery.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        const box = tileOf(event);
        if (!box) {
          if (!event.metaKey && !event.shiftKey) {
            selectOnly(null);
            paintSelection();
          }
          return;
        }
        const p = box.dataset.path;
        if (event.metaKey) {
          if (state.selected.has(p)) state.selected.delete(p);
          else state.selected.add(p);
          state.focus = p;
          state.anchor = p;
        } else if (event.shiftKey) {
          selectRange(p);
        } else if (!state.selected.has(p)) {
          // A press on a selected image keeps the selection, so it can be
          // dragged out together; the click that follows narrows it.
          selectOnly(p);
        }
        paintSelection();
      });

      gallery.addEventListener('click', (event) => {
        const box = tileOf(event);
        if (!box || event.metaKey || event.shiftKey) return;
        selectOnly(box.dataset.path);
        paintSelection();
      });

      gallery.addEventListener('dblclick', (event) => {
        const box = tileOf(event);
        if (box) view(box.dataset.path);
      });

      gallery.addEventListener('dragstart', (event) => {
        const box = tileOf(event);
        if (!box) return;
        event.preventDefault();
        const p = box.dataset.path;
        window.turink.dragFiles(state.selected.has(p) ? selectedPaths() : [p]);
      });

      gallery.addEventListener('contextmenu', async (event) => {
        const box = tileOf(event);
        if (!box) return;
        event.preventDefault();
        const p = box.dataset.path;
        if (!state.selected.has(p)) selectOnly(p);
        paintSelection();
        const paths = selectedPaths();
        const files = s().files;
        const entries = [];
        if (paths.length > 1) entries.push({ header: format(files.selectedHead, { count: paths.length }) });
        entries.push({ id: 'copy', label: t().copy, accelerator: 'Cmd+C' });
        if (paths.length === 1) entries.push({ id: 'view', label: t().view, accelerator: 'Space' });
        entries.push({ type: 'separator' });
        entries.push({ id: 'reveal', label: files.reveal });
        entries.push({ label: files.share, share: paths });
        entries.push({ type: 'separator' });
        entries.push({ id: 'trash', label: t().trash, accelerator: 'Cmd+Backspace' });
        const chosen = await window.turink.fileMenu(entries, { x: event.clientX, y: event.clientY });
        if (chosen === 'copy') copySelected();
        else if (chosen === 'view') view(paths[0]);
        else if (chosen === 'reveal') window.turink.revealFiles(paths);
        else if (chosen === 'trash') trashSelected();
      });

      // Arrow keys move through the images in the order shown. Up and down
      // jump a row, counted from the columns the grid lays out.
      function columns() {
        const grid = gallery.querySelector('.clip-grid');
        return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 1;
      }

      function move(step, extend) {
        const list = order();
        if (list.length === 0) return;
        const at = list.indexOf(state.focus);
        const next = list[Math.min(Math.max(at < 0 ? 0 : at + step, 0), list.length - 1)];
        if (extend) selectRange(next);
        else selectOnly(next);
        paintSelection();
        const box = gallery.querySelector(`.clip-tile[data-path="${CSS.escape(next)}"]`);
        if (box) box.scrollIntoView({ block: 'nearest' });
      }

      gallery.addEventListener('keydown', (event) => {
        const k = event.key;
        if (event.metaKey && event.code === 'KeyA') {
          state.selected = new Set(order());
          paintSelection();
        } else if (event.metaKey && event.code === 'KeyC') {
          copySelected();
        } else if ((event.metaKey && k === 'Backspace') || k === 'Delete') {
          trashSelected();
        } else if (k === ' ' || k === 'Enter') {
          if (state.focus) view(state.focus);
        } else if (k === 'ArrowRight') move(1, event.shiftKey);
        else if (k === 'ArrowLeft') move(-1, event.shiftKey);
        else if (k === 'ArrowDown') move(columns(), event.shiftKey);
        else if (k === 'ArrowUp') move(-columns(), event.shiftKey);
        else return;
        event.preventDefault();
      });

      // ------------------------------------------------ actions

      async function copySelected() {
        const paths = selectedPaths();
        if (paths.length === 0) return;
        const outcome = await ctx.run('clipboard.copy', { paths }, { quiet: true });
        if (outcome.ok) ctx.toast(paths.length === 1 ? t().copied : format(t().copiedMany, { count: paths.length }), 'done');
      }

      function view(p) {
        const list = order();
        if (list.includes(p)) window.turink.openViewer(p, list);
      }

      // One image goes on the keystroke alone, as ⌘⌫ does in Finder; several
      // are listed first. The toast that follows offers the way back.
      async function trashSelected() {
        const paths = selectedPaths();
        if (paths.length === 0) return;
        const list = order();
        const index = list.indexOf(paths[0]);
        const confirm = paths.length === 1 ? { confirm: async () => true } : {};
        const outcome = await ctx.run('images.trash', { paths }, { quiet: true, ...confirm });
        if (!outcome.ok) return;
        await reload();
        const rest = order();
        const next = rest[Math.min(index, rest.length - 1)] || null;
        selectOnly(next);
        paintSelection();
        gallery.focus();
        ctx.toast(paths.length === 1 ? t().trashed : format(t().trashedMany, { count: paths.length }), 'done', {
          label: s().undo,
          run: async () => {
            const restored = await ctx.run('images.restore', { run: outcome.runId }, { quiet: true });
            if (restored.ok) {
              await reload();
              state.selected = new Set(paths);
              state.focus = paths[0];
              paintSelection();
            }
          },
        });
      }

      // ------------------------------------------------ lifecycle

      const timer = setInterval(reload, RESORT_MS);
      active = { reload };
      this.unmount = () => {
        clearInterval(timer);
        active = null;
      };
      reload().then(() => gallery.focus());
    },
  });
})();
