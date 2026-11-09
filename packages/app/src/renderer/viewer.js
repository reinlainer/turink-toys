'use strict';

// The viewer window: one photo filling the window, the folder's other photos a
// key or a swipe away, videos and PDFs among them shown in place, and every control kept at the edges until the pointer
// goes there. Selecting and moving to the Trash run the same images.* tasks as
// the Images screen.

(function () {
  const { el } = window.TurinkDom;
  const { icon } = window.TurinkIcons;
  const math = window.TurinkViewerMath;
  const wheel = window.TurinkWheel.createWheel();

  const ui = {
    port: document.getElementById('viewport'),
    photo: document.getElementById('photo'),
    media: document.getElementById('media'),
    badge: document.getElementById('badge'),
    top: document.getElementById('edge-top'),
    title: document.getElementById('title'),
    zoom: document.getElementById('zoom'),
    lock: document.getElementById('lock'),
    pick: document.getElementById('pick'),
    full: document.getElementById('full'),
    strip: document.getElementById('strip'),
    hud: document.getElementById('hud'),
  };

  const imageURL = (file) => `turink-image://f/${encodeURIComponent(file)}`;
  const thumbURL = (file) => `turink-thumb://t/${encodeURIComponent(file)}?s=128`;
  const format = (template, params) =>
    String(template || '').replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m));
  const baseName = (file) => file.split('/').pop();
  // The same split as the core's formats table: anything not a video or a PDF
  // is a photo, since only those three reach the viewer.
  const VIDEO = ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'];
  const typeOf = (file) => {
    const ext = file.split('.').pop().toLowerCase();
    return VIDEO.includes(ext) ? 'video' : ext === 'pdf' ? 'pdf' : 'photo';
  };

  let t = {};
  let view = { wheel: 'nav' };
  const state = {
    list: [],
    index: -1,
    photo: null, // { width, height } of the photo on screen
    pos: { scale: 1, cx: 0, cy: 0 },
    mode: 'fit',
    keepZoom: false,
    picks: new Set(),
    lastTrash: null,
  };

  const current = () => state.list[state.index] || null;
  const port = () => ({ width: ui.port.clientWidth, height: ui.port.clientHeight });

  // ------------------------------------------------ drawing

  function render() {
    if (!state.photo) return;
    const { scale, cx, cy } = state.pos;
    const w = state.photo.width;
    const h = state.photo.height;
    ui.photo.style.width = `${w}px`;
    ui.photo.style.height = `${h}px`;
    ui.photo.style.transform = `translate(${cx - (w * scale) / 2}px, ${cy - (h * scale) / 2}px) scale(${scale})`;
    ui.photo.style.imageRendering = scale >= 3 ? 'pixelated' : 'auto';
    ui.port.classList.toggle('grab', math.larger(state.pos, state.photo, port()));
    renderZoom();
  }

  function setMode(mode, quiet) {
    if (!state.photo) return;
    state.mode = mode;
    state.pos = math.modeView(mode, state.photo, port());
    render();
    if (!quiet) hud(mode === 'fit' ? t.fitDone : mode === 'width' ? t.widthDone : t.actualDone);
  }

  function zoomAt(next, point, quiet) {
    if (!state.photo) return;
    state.pos = math.zoomAt(state.pos, next, point, state.photo, port());
    state.mode = math.modeOf(state.pos, state.photo, port());
    render();
    if (!quiet) hud(format(t.zoom, { percent: Math.round(state.pos.scale * 100) }));
  }

  function refit() {
    if (!state.photo) return;
    if (state.mode === 'fit' || state.mode === 'width') setMode(state.mode, true);
    else {
      state.pos = math.clamp(state.pos, state.photo, port());
      render();
    }
  }

  function renderZoom() {
    const percent = Math.round(state.pos.scale * 100);
    ui.zoom.textContent =
      state.mode === 'fit' ? format(t.fit, { percent }) : state.mode === 'width' ? format(t.width, { percent }) : format(t.zoom, { percent });
  }

  function renderChrome() {
    const file = current();
    if (!file) return;
    ui.title.textContent = '';
    ui.title.append(
      el('b', null, baseName(file)),
      el('span', null, format(t.position, { index: state.index + 1, count: state.list.length }))
    );
    const size = state.photo || state.media;
    if (size && size.width) ui.title.appendChild(el('span', null, `${size.width} × ${size.height}`));
    document.title = baseName(file);

    ui.lock.textContent = '';
    ui.lock.appendChild(icon('lock', null, 15));
    ui.lock.title = t.keepZoom;
    ui.lock.classList.toggle('on', state.keepZoom);

    const picked = state.picks.has(file);
    ui.pick.textContent = '';
    ui.pick.append(icon(picked ? 'check' : 'pick', null, 15), el('span', null, picked ? t.selected : t.select));
    ui.pick.classList.toggle('on', picked);
    ui.pick.title = `${picked ? t.selected : t.select} (P)`;

    ui.full.textContent = '';
    ui.full.appendChild(icon('expand', null, 15));
    ui.full.title = t.fullScreen;

    ui.badge.textContent = '';
    if (picked) {
      const dot = el('span', 'pick-dot');
      dot.appendChild(icon('check', null, 15));
      ui.badge.appendChild(dot);
    }
    renderZoom();
    if (ui.strip.classList.contains('show')) renderStrip();
  }

  // The strip holds the photos around the current one rather than the whole
  // folder, which may run to thousands.
  function renderStrip() {
    ui.strip.textContent = '';
    const from = Math.max(0, state.index - 40);
    const to = Math.min(state.list.length, state.index + 41);
    for (let i = from; i < to; i += 1) {
      const file = state.list[i];
      const item = el('div', 'strip-item' + (i === state.index ? ' current' : ''));
      const img = el('img');
      img.alt = '';
      img.draggable = false;
      img.loading = 'lazy';
      img.src = thumbURL(file);
      item.appendChild(img);
      if (state.picks.has(file)) {
        const dot = el('span', 'pick-dot');
        dot.appendChild(icon('check', null, 9));
        item.appendChild(dot);
      }
      item.addEventListener('click', () => show(i));
      ui.strip.appendChild(item);
    }
    const here = ui.strip.querySelector('.current');
    if (here) here.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  let hudTimer = null;
  function hud(text) {
    ui.hud.textContent = text;
    ui.hud.classList.add('show');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => ui.hud.classList.remove('show'), 900);
  }

  // ------------------------------------------------ loading

  // The photos either side are decoded ahead, so turning the page shows the
  // next one without a wait.
  const ahead = new Map();
  function prefetch() {
    const keep = new Set();
    for (const offset of [1, -1, 2, -2]) {
      const file = state.list[state.index + offset];
      if (!file || typeOf(file) !== 'photo') continue;
      keep.add(file);
      if (!ahead.has(file)) {
        const img = new Image();
        img.src = imageURL(file);
        img.decode().catch(() => {});
        ahead.set(file, img);
      }
    }
    for (const file of ahead.keys()) if (!keep.has(file)) ahead.delete(file);
  }

  let loading = 0;

  function clearMedia() {
    for (const v of ui.media.querySelectorAll('video')) v.pause();
    ui.media.textContent = '';
    ui.media.hidden = true;
    ui.photo.hidden = false;
    document.body.classList.remove('media-mode');
  }

  // A video plays and a PDF scrolls in the window; zooming is the player's
  // and the PDF viewer's own business, so the photo controls step aside.
  function showMedia(index, file, token) {
    state.index = index;
    state.photo = null;
    ui.photo.hidden = true;
    ui.photo.removeAttribute('src');
    ui.media.textContent = '';
    ui.media.hidden = false;
    document.body.classList.add('media-mode');
    if (typeOf(file) === 'pdf') {
      const pages = el('iframe');
      pages.src = `${imageURL(file)}#toolbar=0&navpanes=0&view=FitH`;
      pages.title = baseName(file);
      ui.media.appendChild(pages);
      window.turink.viewerShown(file, 850, 1100);
    } else {
      const video = el('video');
      video.controls = true;
      video.autoplay = true;
      video.src = imageURL(file);
      video.addEventListener('loadedmetadata', () => {
        if (token !== loading) return;
        state.media = { width: video.videoWidth, height: video.videoHeight };
        renderChrome();
        window.turink.viewerShown(file, video.videoWidth || 1280, video.videoHeight || 720);
      });
      // A codec Chromium does not carry, such as ProRes, gets its Quick Look
      // frame and the app macOS would use.
      video.addEventListener('error', () => {
        if (token !== loading) return;
        ui.media.textContent = '';
        const poster = el('img', 'poster');
        poster.src = `turink-thumb://t/${encodeURIComponent(file)}?s=1024`;
        const fallback = el('div', 'fallback');
        const open = el('button', null, t.openDefault);
        open.type = 'button';
        open.addEventListener('click', () => window.turink.openDefault(file));
        fallback.append(el('span', null, t.cannotPlay), open);
        ui.media.append(poster, fallback);
      });
      ui.media.appendChild(video);
    }
    state.media = null;
    renderChrome();
    prefetch();
  }

  function show(index, { opening = false } = {}) {
    if (index < 0 || index >= state.list.length) return;
    const file = state.list[index];
    const token = ++loading;
    if (typeOf(file) !== 'photo') return showMedia(index, file, token);
    const keep = !opening && state.keepZoom && state.photo;
    const img = new Image();
    img.onload = () => {
      if (token !== loading) return;
      clearMedia();
      state.index = index;
      state.photo = { width: img.naturalWidth, height: img.naturalHeight };
      ui.photo.src = img.src;
      if (keep && (state.mode === 'free' || state.mode === 'actual')) {
        state.pos = math.clamp(state.pos, state.photo, port());
        render();
      } else {
        setMode(keep && state.mode === 'width' ? 'width' : 'fit', true);
      }
      renderChrome();
      prefetch();
      // The main process sizes the window from the photo's own size; the
      // photo is fitted again when the window settles.
      window.turink.viewerShown(file, state.photo.width, state.photo.height);
    };
    img.onerror = () => {
      if (token !== loading) return;
      clearMedia();
      state.index = index;
      renderChrome();
      hud(t.failed);
    };
    img.src = imageURL(file);
  }

  function step(delta) {
    const next = state.index + delta;
    if (next < 0) return hud(t.first);
    if (next >= state.list.length) return hud(t.last);
    show(next);
  }

  async function loadPicks() {
    const outcome = await window.turink.peekTask('images.selected', {});
    state.picks = new Set(outcome.ok ? outcome.result.images.map((image) => image.path) : []);
  }

  // ------------------------------------------------ actions

  let selecting = Promise.resolve();
  function togglePick() {
    const file = current();
    if (!file) return;
    const off = state.picks.has(file);
    selecting = selecting
      .then(() => window.turink.peekTask('images.select', { paths: [file], off }))
      .then(async (outcome) => {
        if (!outcome.ok) return hud(outcome.error.message);
        await loadPicks();
        renderChrome();
        hud(off ? t.selectedOff : t.selectedOn);
      })
      .catch(() => {});
  }

  // ⌘⌫ is its own confirmation, as it is in Finder, and ⌘Z puts the photo back.
  async function trash() {
    const file = current();
    if (!file) return;
    let outcome = await window.turink.runTask('images.trash', { paths: [file] });
    if (!outcome.ok && outcome.error.code === 'NEEDS_CONFIRM' && outcome.plan) {
      outcome = await window.turink.runTask('images.trash', { paths: [file] }, outcome.plan.hash);
    }
    if (!outcome.ok) return hud(outcome.error.message);
    state.lastTrash = { runId: outcome.runId, file, index: state.index };
    state.list.splice(state.index, 1);
    ahead.delete(file);
    hud(t.trashed);
    if (state.list.length === 0) return window.turink.closeViewer();
    show(Math.min(state.index, state.list.length - 1));
  }

  async function undoTrash() {
    const last = state.lastTrash;
    if (!last) return;
    state.lastTrash = null;
    const outcome = await window.turink.runTask('images.restore', { run: last.runId });
    if (!outcome.ok) return hud(outcome.error.message);
    state.list.splice(last.index, 0, last.file);
    show(last.index);
    hud(t.restored);
  }

  function toggleKeepZoom() {
    state.keepZoom = !state.keepZoom;
    renderChrome();
    hud(state.keepZoom ? t.keepZoomOn : t.keepZoomOff);
  }

  async function toggleFullScreen() {
    await window.turink.viewerFullScreen();
    hideEdges();
  }

  // ------------------------------------------------ edges

  let edgeTimer = null;
  function showEdges(top, bottom) {
    clearTimeout(edgeTimer);
    if (top !== ui.top.classList.contains('show')) window.turink.viewerChrome(top);
    ui.top.classList.toggle('show', top);
    const wasBottom = ui.strip.classList.contains('show');
    ui.strip.classList.toggle('show', bottom);
    if (bottom && !wasBottom) renderStrip();
    ui.badge.style.opacity = top ? 0 : 1;
  }
  function hideEdges() {
    showEdges(false, false);
  }

  // An edge appears when the pointer comes close and goes only once it has
  // moved clearly away, so hovering on the boundary cannot make it flicker.
  const TOP_SHOW = 52;
  const TOP_HIDE = 80;
  const BOTTOM_SHOW = 96;
  const BOTTOM_HIDE = 124;
  let lastY = Infinity;

  document.addEventListener('mousemove', (e) => {
    const y = e.clientY;
    lastY = y;
    const height = window.innerHeight;
    const top = y < (ui.top.classList.contains('show') ? TOP_HIDE : TOP_SHOW);
    const bottom = height > 260 && y > height - (ui.strip.classList.contains('show') ? BOTTOM_HIDE : BOTTOM_SHOW);
    if (top || bottom) showEdges(top, bottom);
    else if (ui.top.classList.contains('show') || ui.strip.classList.contains('show')) {
      clearTimeout(edgeTimer);
      edgeTimer = setTimeout(hideEdges, 250);
    }
  });
  // Over the top bar macOS takes the pointer to drag the window, and the page
  // is told the pointer left. That is no reason to hide the bar it is on, which
  // would hand the pointer back and show the bar again in a loop.
  document.addEventListener('mouseleave', () => {
    if (lastY > TOP_HIDE) hideEdges();
  });
  window.addEventListener('blur', hideEdges);

  // ------------------------------------------------ pointer and keys

  ui.port.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (!state.photo) {
        const file = current();
        if (!file || typeOf(file) !== 'video') return;
        const intent = wheel.interpret(e, { zoomed: false, wheel: 'nav' }, performance.now());
        if (intent.type === 'page') step(intent.step);
        return;
      }
      const r = ui.port.getBoundingClientRect();
      const point = { x: e.clientX - r.left, y: e.clientY - r.top };
      const zoomed = math.larger(state.pos, state.photo, port());
      const intent = wheel.interpret(e, { zoomed, wheel: view.wheel }, performance.now());
      if (intent.type === 'zoom') zoomAt(state.pos.scale * intent.factor, point);
      else if (intent.type === 'pan') {
        state.pos = math.pan(state.pos, intent.dx, intent.dy, state.photo, port());
        state.mode = 'free';
        render();
      } else if (intent.type === 'page') step(intent.step);
    },
    { passive: false }
  );

  ui.port.addEventListener('dblclick', (e) => {
    if (!state.photo) return;
    if (state.mode !== 'fit') return setMode('fit');
    const r = ui.port.getBoundingClientRect();
    zoomAt(1, { x: e.clientX - r.left, y: e.clientY - r.top }, true);
    hud(t.actualDone);
  });

  ui.port.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !state.photo) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const start = state.pos;
    ui.port.classList.add('grabbing');
    const move = (m) => {
      state.pos = math.pan(start, m.clientX - startX, m.clientY - startY, state.photo, port());
      if (math.larger(state.pos, state.photo, port())) state.mode = 'free';
      render();
    };
    const up = () => {
      ui.port.classList.remove('grabbing');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  ui.zoom.addEventListener('click', () => setMode(state.mode === 'fit' ? 'actual' : 'fit'));
  ui.lock.addEventListener('click', toggleKeepZoom);
  ui.pick.addEventListener('click', togglePick);
  ui.full.addEventListener('click', toggleFullScreen);

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    // Letter shortcuts are read by key position, because with a Korean input
    // source the P key reports "ㅔ" rather than "p".
    const code = e.code;
    const center = { x: port().width / 2, y: port().height / 2 };
    if (e.metaKey && k === 'Backspace') trash();
    else if (e.metaKey && code === 'KeyZ') undoTrash();
    else if (e.metaKey && (k === '=' || k === '+')) zoomAt(state.pos.scale * 1.25, center);
    else if (e.metaKey && k === '-') zoomAt(state.pos.scale / 1.25, center);
    else if (e.metaKey) return;
    else if (k === ' ' && current() && typeOf(current()) === 'video' && ui.media.querySelector('video')) {
      const video = ui.media.querySelector('video');
      if (video.paused) video.play();
      else video.pause();
    } else if (k === 'Escape' || k === ' ') window.turink.closeViewer();
    else if (k === 'ArrowRight' || k === 'PageDown') step(1);
    else if (k === 'ArrowLeft' || k === 'PageUp') step(-1);
    else if (k === 'Home') show(0);
    else if (k === 'End') show(state.list.length - 1);
    else if (k === '1') setMode('fit');
    else if (k === '2') setMode('width');
    else if (k === '0') setMode('actual');
    else if (k === '=' || k === '+') zoomAt(state.pos.scale * 1.25, center);
    else if (k === '-') zoomAt(state.pos.scale / 1.25, center);
    else if (code === 'KeyL') toggleKeepZoom();
    else if (code === 'KeyP') togglePick();
    else if (code === 'KeyF') toggleFullScreen();
    else return;
    e.preventDefault();
  });

  window.addEventListener('resize', refit);

  // ------------------------------------------------ start

  window.turink.onViewerLoad(async ({ file, list }) => {
    state.list = list && list.length ? list.slice() : [file];
    state.lastTrash = null;
    await loadPicks();
    show(Math.max(0, state.list.indexOf(file)), { opening: true });
  });
  window.turink.onImagesView((next) => (view = next));

  (async () => {
    const strings = await window.turink.strings();
    t = strings.ui.viewer;
    document.documentElement.lang = strings.locale;
    view = await window.turink.imagesView();
    ui.zoom.title = t.fitDone;
    // A photo may have arrived before the words for its labels.
    if (current()) renderChrome();
  })();
})();
