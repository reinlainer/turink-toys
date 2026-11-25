'use strict';

// The images kept from the clipboard, the last day above the rest. Nothing
// leaves this gallery on its own: the person selects what to remove. ⌘C puts
// the selection back on the clipboard as images, which is the point of keeping
// them, so a screenshot can be pasted again without a file ever being saved.
//
// Selecting works as in Photos rather than Finder. The first click selects an
// image; while anything is selected a click adds or removes one image, so a
// stray click never throws away what was picked. Esc or the bar's button
// clears it. Space selects the image with the box, and Enter, a double-click or
// View in the menu opens it.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);
  const { thumbURL } = window.TurinkImagesPreview;
  const { pressIntent, Selection, rectFrom, hitsIn, edgeScroll } = window.TurinkClipSelection;

  // The screen on display, if this is it. Folder changes arrive whichever
  // screen is showing and only matter here.
  let active = null;
  window.turink.onClipboardChanged(() => active && active.reload());

  // The split between the last day and older moves with the clock, so an open
  // screen sorts itself again now and then.
  const RESORT_MS = 5 * 60 * 1000;

  // How far the pointer moves from empty space before a press becomes a
  // rectangle rather than a click.
  const MARQUEE_SLOP = 4;

  screens.push({
    id: 'clipboard',
    icon: 'clipboard',
    tasks: ['clipboard.list', 'clipboard.copy', 'clipboard.save', 'clipboard.collect'],

    mount(root, ctx) {
      const { el, icon, s, format } = ctx;
      const t = () => s().clipboard;
      const state = { listing: null };
      const sel = new Selection();

      root.appendChild(ctx.header(s().nav.clipboard));

      // ------------------------------------------------ collection switch

      const card = el('section', 'card setting-card clip-setting');
      const head = el('div', 'setting-head');
      const text = el('div', 'setting-text');
      // One string with a line per point, so a translation may use a
      // different number of lines.
      const points = (lines, className) => {
        const list = el('ul', `setting-points${className ? ` ${className}` : ''}`);
        for (const line of lines.split('\n').filter(Boolean)) list.appendChild(el('li', null, line));
        return list;
      };
      text.appendChild(el('h2', null, t().collect));
      text.appendChild(points(t().collectPoints));
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
      gallery.setAttribute('aria-label', s().nav.clipboard);
      root.appendChild(gallery);

      const bar = el('div', 'clip-bar');
      const count = el('span', 'clip-bar-count');
      const button = (label, className = '') => {
        const b = el('button', `button small ${className}`.trim(), label);
        b.type = 'button';
        return b;
      };
      const selectAllButton = button(t().selectAll);
      const clearButton = button(s().selectNone);
      const reveal = button(t().openFolder);
      const copyButton = button(t().copy);
      const trashButton = button(t().trash, 'danger-text');
      bar.append(count, selectAllButton, clearButton, el('span', 'clip-bar-space'), reveal, copyButton, trashButton);
      root.appendChild(bar);

      selectAllButton.addEventListener('click', () => {
        sel.all(order());
        paintSelection();
      });
      clearButton.addEventListener('click', () => {
        sel.clear();
        paintSelection();
        gallery.focus({ preventScroll: true });
      });
      reveal.addEventListener('click', () => state.listing && window.turink.reveal(state.listing.folder));
      copyButton.addEventListener('click', () => copy(selectedPaths()));
      trashButton.addEventListener('click', () => trash(selectedPaths()));

      const items = () => (state.listing ? [...state.listing.recent, ...state.listing.older] : []);
      const order = () => items().map((item) => item.path);
      const selectedPaths = () => sel.inOrder(order());

      function timeLabel(item, recent) {
        const date = new Date(item.saved);
        return recent ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ctx.relativeTime(item.saved);
      }

      // Each tile is an option of the listbox the gallery is, so a screen
      // reader follows the box and reads whether an image is selected.
      let tiles = 0;
      function tile(item, recent) {
        const box = el('div', 'clip-tile');
        box.id = `clip-tile-${tiles++}`;
        box.dataset.path = item.path;
        box.draggable = true;
        box.title = item.name;
        box.setAttribute('role', 'option');
        box.setAttribute('aria-label', item.name);
        const thumb = el('div', 'clip-thumb');
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = thumbURL(item.path, 220);
        img.addEventListener('error', () => img.classList.add('missing'));
        thumb.appendChild(img);
        // The circle shows on hover, and on every image once something is
        // selected, as in Photos.
        const pick = el('span', 'pick-dot');
        pick.title = s().files.select;
        pick.setAttribute('aria-hidden', 'true');
        pick.appendChild(icon('check', null, 12));
        box.append(thumb, pick, el('span', 'clip-time', timeLabel(item, recent)));
        return box;
      }

      function section(title, list, recent) {
        if (list.length === 0) return;
        const group = el('div', 'clip-group');
        group.setAttribute('aria-hidden', 'true');
        group.appendChild(el('span', 'clip-group-name', title));
        group.appendChild(el('span', 'clip-group-count', String(list.length)));
        gallery.appendChild(group);
        const grid = el('div', 'clip-grid');
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', title);
        for (const item of list) grid.appendChild(tile(item, recent));
        gallery.appendChild(grid);
      }

      function render() {
        const listing = state.listing;
        toggle.checked = Boolean(listing && listing.collecting);
        card.classList.toggle('active', toggle.checked);
        gallery.textContent = '';
        tiles = 0;
        if (drag) drag.boxes = null;
        if (!listing) return;
        if (items().length === 0) {
          gallery.removeAttribute('role');
          gallery.removeAttribute('aria-multiselectable');
          gallery.appendChild(el('p', 'clip-empty', t().empty));
        } else {
          gallery.setAttribute('role', 'listbox');
          gallery.setAttribute('aria-multiselectable', 'true');
          section(t().recent, listing.recent, true);
          section(t().older, listing.older, false);
        }
        paintSelection();
      }

      const tileFor = (p) => gallery.querySelector(`.clip-tile[data-path="${CSS.escape(p)}"]`);

      function paintSelection() {
        let current = null;
        for (const box of gallery.querySelectorAll('.clip-tile')) {
          const picked = sel.has(box.dataset.path);
          box.classList.toggle('selected', picked);
          box.setAttribute('aria-selected', String(picked));
          const focused = box.dataset.path === sel.focus;
          box.classList.toggle('current', focused);
          if (focused) current = box;
        }
        if (current) gallery.setAttribute('aria-activedescendant', current.id);
        else gallery.removeAttribute('aria-activedescendant');
        const n = sel.size;
        const total = order().length;
        gallery.classList.toggle('selecting', n > 0);
        count.textContent = n ? format(t().selection, { count: n }) : '';
        selectAllButton.disabled = total === 0 || n === total;
        clearButton.hidden = n === 0;
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
        sel.prune(new Set(order()));
        render();
      }

      // ------------------------------------------------ pointer

      const tileOf = (event) => event.target.closest('.clip-tile');
      const onDot = (event) => Boolean(event.target.closest('.pick-dot'));
      const scroller = root.parentElement;

      // A click waiting to land: what a press on an image will do if the
      // pointer comes up without dragging.
      let pending = null;
      // The selection before the first press of a click, put back when the
      // press turns out to be the start of a double-click.
      let beforeClick = null;
      // A sweep across images or a rectangle from empty space, while the
      // button is held.
      let drag = null;

      gallery.addEventListener('mousedown', (event) => {
        // ⌃-click is the right click on a Mac, and the menu handles it.
        if (event.button !== 0 || event.ctrlKey) return;
        const box = tileOf(event);
        if (!box) return;
        const p = box.dataset.path;
        const list = order();
        const repeat = event.detail > 1;
        if (!repeat) beforeClick = { path: p, saved: sel.snapshot() };
        pending = null;
        const intent = pressIntent({
          selecting: sel.size > 0,
          selected: sel.has(p),
          shift: event.shiftKey,
          onDot: onDot(event),
          repeat,
        });
        if (intent === 'range') {
          sel.rangeTo(p, list);
        } else if (intent === 'toggle' || intent === 'add-and-swipe') {
          // A press that selects also starts a sweep. Holding back the
          // default keeps the tile from being dragged out as a file.
          event.preventDefault();
          gallery.focus({ preventScroll: true });
          if (sel.has(p)) sel.toggle(p);
          else startSweep(p, event);
        } else if (intent === 'pick-on-click' || intent === 'drop-on-click') {
          pending = { path: p, intent };
        }
        paintSelection();
      });

      gallery.addEventListener('click', (event) => {
        const box = tileOf(event);
        const waiting = pending;
        pending = null;
        if (!box || !waiting || waiting.path !== box.dataset.path || event.detail > 1) return;
        if (waiting.intent === 'pick-on-click') sel.pick(waiting.path);
        else sel.toggle(waiting.path);
        paintSelection();
      });

      // A double-click opens the image and leaves the selection as it was
      // before its first click, which may have picked or dropped the image.
      gallery.addEventListener('dblclick', (event) => {
        const box = tileOf(event);
        if (!box || onDot(event)) return;
        const p = box.dataset.path;
        if (beforeClick && beforeClick.path === p) sel.restore(beforeClick.saved);
        beforeClick = null;
        sel.focus = p;
        paintSelection();
        view(p);
      });

      // A drag from a selected image takes the whole selection out as files,
      // and one from an image when nothing is selected takes that file alone.
      gallery.addEventListener('dragstart', (event) => {
        const box = tileOf(event);
        if (!box) return;
        event.preventDefault();
        pending = null;
        if (drag) return;
        const p = box.dataset.path;
        window.turink.dragFiles(sel.has(p) ? selectedPaths() : [p]);
      });

      function startSweep(p, event) {
        const saved = sel.snapshot();
        sel.beginSweep(p, order());
        beginDrag({ kind: 'sweep', saved, last: p, x: event.clientX, y: event.clientY });
      }

      // A press on empty space, the gaps between images included, draws a
      // rectangle once the pointer moves. It replaces the selection, or adds
      // to it with ⌘ or Shift held. A plain click there changes nothing.
      function onEmptyPress(event) {
        if (event.button !== 0 || event.ctrlKey || drag) return;
        if (!root.contains(event.target) && event.target !== scroller) return;
        // A press on the scroll bar scrolls.
        if (event.clientX >= scroller.getBoundingClientRect().left + scroller.clientWidth) return;
        if (event.target.closest('.clip-tile, .clip-setting, .clip-bar, .screen-head, button, input, a, select, textarea')) return;
        if (order().length === 0) return;
        event.preventDefault();
        gallery.focus({ preventScroll: true });
        beginDrag({
          kind: 'marquee',
          from: rootPoint(event.clientX, event.clientY),
          adds: event.metaKey || event.shiftKey,
          saved: sel.snapshot(),
          started: false,
          boxes: null,
          shape: null,
          x: event.clientX,
          y: event.clientY,
        });
      }
      scroller.addEventListener('mousedown', onEmptyPress);

      // Points in the screen's own frame, which scrolls with the images, so
      // a rectangle keeps its far corner where it started as the list moves.
      function rootPoint(x, y) {
        const r = root.getBoundingClientRect();
        return { x: x - r.left, y: y - r.top };
      }

      function tileBoxes() {
        const r = root.getBoundingClientRect();
        return [...gallery.querySelectorAll('.clip-tile')].map((box) => {
          const b = box.getBoundingClientRect();
          return { path: box.dataset.path, left: b.left - r.left, top: b.top - r.top, right: b.right - r.left, bottom: b.bottom - r.top };
        });
      }

      function beginDrag(next) {
        drag = next;
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
        scroller.addEventListener('scroll', onDragScroll);
      }

      function onDragMove(event) {
        if (!drag) return;
        drag.x = event.clientX;
        drag.y = event.clientY;
        track();
        followEdge();
      }

      function onDragScroll() {
        if (drag) track();
      }

      function track() {
        const list = order();
        if (drag.kind === 'sweep') {
          const under = document.elementFromPoint(drag.x, drag.y);
          const box = under && under.closest('.clip-tile');
          if (!box || !gallery.contains(box) || box.dataset.path === drag.last) return;
          drag.last = box.dataset.path;
          sel.rangeTo(drag.last, list);
          paintSelection();
          return;
        }
        const at = rootPoint(drag.x, drag.y);
        if (!drag.started) {
          if (Math.hypot(at.x - drag.from.x, at.y - drag.from.y) < MARQUEE_SLOP) return;
          drag.started = true;
          drag.shape = el('div', 'clip-marquee');
          root.appendChild(drag.shape);
        }
        if (!drag.boxes) drag.boxes = tileBoxes();
        // The rectangle stays inside the visible width and the screen's own
        // height, so drawing it never makes the page scroll sideways.
        const r = root.getBoundingClientRect();
        const s = scroller.getBoundingClientRect();
        const minX = s.left - r.left;
        const maxX = minX + scroller.clientWidth - 1;
        const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
        const end = { x: clamp(at.x, minX, maxX), y: clamp(at.y, 0, root.offsetHeight - 1) };
        const rect = rectFrom(drag.from, end);
        Object.assign(drag.shape.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.right - rect.left}px`,
          height: `${rect.bottom - rect.top}px`,
        });
        sel.gather(hitsIn(rect, drag.boxes), drag.adds ? drag.saved.selected : []);
        paintSelection();
      }

      // Holding the pointer near the top or bottom while dragging scrolls the
      // list, so a selection can run past what fits on screen.
      let frame = 0;
      function followEdge() {
        if (frame || !drag) return;
        const step = () => {
          frame = 0;
          if (!drag) return;
          const s = scroller.getBoundingClientRect();
          const bottom = Math.min(s.bottom, bar.getBoundingClientRect().top);
          const dy = edgeScroll(drag.y, s.top, bottom);
          if (!dy) return;
          const before = scroller.scrollTop;
          scroller.scrollTop += dy;
          if (scroller.scrollTop !== before) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      }

      function onDragEnd() {
        endDrag(false);
      }

      function endDrag(cancel) {
        if (!drag) return;
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        scroller.removeEventListener('scroll', onDragScroll);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (drag.shape) drag.shape.remove();
        // A finished sweep or rectangle becomes the selection a later Shift
        // range adds to; Esc puts back what was selected before it began.
        if (cancel) sel.restore(drag.saved);
        else if (drag.kind === 'sweep' || drag.started) sel.settle(sel.anchor);
        drag = null;
        paintSelection();
      }

      // The menu acts on the whole selection when it opens on a selected
      // image, and on that image alone otherwise. Opening it never changes
      // what is selected.
      gallery.addEventListener('contextmenu', async (event) => {
        const box = tileOf(event);
        if (!box) return;
        event.preventDefault();
        pending = null;
        const p = box.dataset.path;
        const paths = sel.has(p) ? selectedPaths() : [p];
        sel.focus = p;
        paintSelection();
        const files = s().files;
        const entries = [];
        if (paths.length > 1) entries.push({ header: format(files.selectedHead, { count: paths.length }) });
        entries.push({ id: 'view', label: t().view, accelerator: 'Enter' });
        entries.push({ id: 'copy', label: t().copy, accelerator: 'Cmd+C' });
        entries.push({ type: 'separator' });
        entries.push({ id: 'reveal', label: files.reveal });
        entries.push({ label: files.share, share: paths });
        entries.push({ type: 'separator' });
        entries.push({ id: 'trash', label: t().trash, accelerator: 'Cmd+Backspace' });
        const chosen = await window.turink.fileMenu(entries, { x: event.clientX, y: event.clientY });
        if (chosen === 'view') view(p);
        else if (chosen === 'copy') copy(paths);
        else if (chosen === 'reveal') window.turink.revealFiles(paths);
        else if (chosen === 'trash') trash(paths);
      });

      // ------------------------------------------------ keys

      // Arrow keys move the box through the images in the order shown, without
      // touching the selection; Shift with an arrow selects the run. Up and
      // down jump a row, counted from the columns the grid lays out.
      function columns() {
        const grid = gallery.querySelector('.clip-grid');
        return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 1;
      }

      function move(step, extend) {
        const list = order();
        const next = sel.stepFrom(step, list);
        if (!next) return;
        if (extend) {
          sel.rangeTo(next, list);
        } else {
          sel.focus = next;
        }
        paintSelection();
        const box = tileFor(next);
        if (box) box.scrollIntoView({ block: 'nearest' });
      }

      gallery.addEventListener('keydown', (event) => {
        const k = event.key;
        if (event.metaKey && event.code === 'KeyA') {
          sel.all(order());
          paintSelection();
        } else if (event.metaKey && event.code === 'KeyC') {
          copy(selectedPaths());
        } else if ((event.metaKey && k === 'Backspace') || k === 'Delete') {
          trash(selectedPaths());
        } else if (k === 'Escape') {
          if (drag) endDrag(true);
          else if (sel.size > 0) {
            sel.clear();
            paintSelection();
          } else return;
        } else if (k === ' ') {
          if (!event.repeat) {
            const p = sel.focus || sel.stepFrom(0, order());
            if (p) {
              sel.toggle(p);
              paintSelection();
            }
          }
        } else if (k === 'Enter') {
          const p = sel.focus || selectedPaths()[0];
          if (p) view(p);
        } else if (k === 'ArrowRight') move(1, event.shiftKey);
        else if (k === 'ArrowLeft') move(-1, event.shiftKey);
        else if (k === 'ArrowDown') move(columns(), event.shiftKey);
        else if (k === 'ArrowUp') move(-columns(), event.shiftKey);
        else return;
        event.preventDefault();
      });

      // ------------------------------------------------ actions

      async function copy(paths) {
        if (paths.length === 0) return;
        const outcome = await ctx.run('clipboard.copy', { paths }, { quiet: true });
        if (outcome.ok) ctx.toast(paths.length === 1 ? t().copied : format(t().copiedMany, { count: paths.length }), 'done');
      }

      function view(p) {
        const list = order();
        if (list.includes(p)) window.turink.openViewer(p, list);
      }

      // One image goes on the keystroke alone, as ⌘⌫ does in Finder; several
      // are listed first. The box moves on to the image after them, and the
      // toast that follows offers the way back.
      async function trash(paths) {
        if (paths.length === 0) return;
        const wasSelected = paths.every((p) => sel.has(p));
        const list = order();
        const index = list.indexOf(paths[0]);
        const confirm = paths.length === 1 ? { confirm: async () => true } : {};
        const outcome = await ctx.run('images.trash', { paths }, { quiet: true, ...confirm });
        if (!outcome.ok) return;
        await reload();
        const rest = order();
        sel.focus = rest[Math.min(index, rest.length - 1)] || null;
        paintSelection();
        gallery.focus({ preventScroll: true });
        ctx.toast(paths.length === 1 ? t().trashed : format(t().trashedMany, { count: paths.length }), 'done', {
          label: s().undo,
          run: async () => {
            const restored = await ctx.run('images.restore', { run: outcome.runId }, { quiet: true });
            if (restored.ok) {
              await reload();
              if (wasSelected) sel.gather(paths, sel.selected);
              sel.focus = paths[0];
              sel.settle(sel.anchor);
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
        endDrag(true);
        scroller.removeEventListener('mousedown', onEmptyPress);
        active = null;
      };
      reload().then(() => gallery.focus());
    },
  });
})();
