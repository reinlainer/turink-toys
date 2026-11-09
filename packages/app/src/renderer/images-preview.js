'use strict';

// The large preview beside the Images grid. It shows whatever the grid has
// focused: a photo, a video that plays in place, a PDF that scrolls through its
// pages, or a folder as a wall of what is inside it. The screen owns the data
// and the actions; this module only draws them.

(function () {
  const thumbURL = (file, size) =>
    `turink-thumb://t/${encodeURIComponent(file)}?s=${Math.round(size * (window.devicePixelRatio || 1))}`;
  const fileURL = (file) => `turink-image://f/${encodeURIComponent(file)}`;

  // "1:42", or "1:02:05" past an hour.
  function clock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '';
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  }

  // What a folder holds, as one line: "Photos 229 · Videos 2".
  function countLine(count, t, format) {
    if (!count) return '';
    const more = count.capped || count.partial ? '+' : '';
    const parts = [];
    if (count.photos) parts.push(format(t.photoCount, { count: count.photos.toLocaleString() + more }));
    if (count.videos) parts.push(format(t.videoCount, { count: count.videos.toLocaleString() + more }));
    if (count.pdfs) parts.push(format(t.pdfCount, { count: count.pdfs.toLocaleString() + more }));
    return parts.join(' · ');
  }

  function createPreview(pane, deps) {
    const { el, icon, t, format, formatBytes } = deps;
    let shown = null;

    function stop() {
      for (const media of pane.querySelectorAll('video')) media.pause();
    }

    function frame() {
      stop();
      pane.textContent = '';
      const stage = el('div', 'images-preview-stage');
      const info = el('div', 'images-preview-info');
      pane.append(stage, info);
      return { stage, info };
    }

    function facts(list, pairs) {
      const dl = el('dl', 'images-facts');
      for (const [label, value] of pairs) {
        if (value === null || value === undefined || value === '') continue;
        const dd = el('dd');
        if (value instanceof Node) dd.appendChild(value);
        else dd.textContent = value;
        dl.append(el('dt', null, label), dd);
      }
      list.appendChild(dl);
      return dl;
    }

    function button(className, iconName, label, key, onClick) {
      const b = el('button', className);
      b.type = 'button';
      b.append(icon(iconName, null, 15), el('span', null, label));
      if (key) b.appendChild(el('span', 'kbd', key));
      b.addEventListener('click', onClick);
      return b;
    }

    // ---------------------------------------------------------- folder

    function showFolder(folder, count) {
      const s = t();
      const { stage, info } = frame();
      stage.classList.add('folder');
      const previews = (count && count.previews) || [];
      if (previews.length > 0) {
        const wall = el('div', 'images-mosaic');
        const total = count ? (count.photos || 0) + (count.videos || 0) : 0;
        const many = previews.length === 9 && total > 9;
        for (const file of previews.slice(0, many ? 8 : 9)) {
          const img = el('img');
          img.alt = '';
          img.draggable = false;
          img.src = thumbURL(file, 160);
          img.addEventListener('error', () => img.classList.add('missing'));
          wall.appendChild(img);
        }
        if (many) {
          const more = count.capped || count.partial ? '+' : '';
          wall.appendChild(el('div', 'images-mosaic-more', `+${(total - 8).toLocaleString()}${more}`));
        }
        stage.appendChild(wall);
      } else {
        const empty = el('div', 'images-preview-empty');
        empty.appendChild(icon('folder', 'images-preview-folder', 72));
        if (count) empty.appendChild(el('span', null, countLine(count, s, format) ? s.noPreview : s.emptyFolderLong));
        stage.appendChild(empty);
      }
      stage.addEventListener('dblclick', () => deps.openFolder(folder.path));

      info.appendChild(el('div', 'images-preview-name', folder.name));
      let items;
      if (!count) items = el('span', 'muted', s.counting);
      else {
        items = el('span', null, countLine(count, s, format) || s.none);
        if (count.folders > 0) items.append(' ', el('span', 'muted', s.withSubfolders));
      }
      facts(info, [
        [s.items, items],
        [s.subfolders, count && count.folders ? format(s.subfolderCount, { count: count.folders }) : null],
      ]);
      const actions = el('div', 'images-actions');
      actions.appendChild(button('button primary', 'folder', s.openFolderButton, '↵', () => deps.openFolder(folder.path)));
      info.appendChild(actions);
    }

    // ---------------------------------------------------------- files

    function pickButton(file) {
      const s = t();
      const picked = deps.isPicked(file.path);
      const b = button('button' + (picked ? ' on' : ''), picked ? 'check' : 'pick', picked ? s.selected : s.select, 'P', () =>
        deps.togglePick(file.path)
      );
      b.setAttribute('aria-pressed', String(picked));
      if (picked) b.title = s.selectedHint;
      return b;
    }

    function showPhoto(stage, file, rows) {
      const img = el('img');
      img.alt = '';
      img.draggable = false;
      img.src = thumbURL(file.path, 512);
      const dims = el('span', null, '…');
      rows.push([t().dimensions, dims]);
      const full = new Image();
      full.onload = () => {
        if (!shown || shown.path !== file.path) return;
        img.src = full.src;
        dims.textContent = `${full.naturalWidth} × ${full.naturalHeight}`;
      };
      full.src = fileURL(file.path);
      img.addEventListener('dblclick', () => deps.openViewer(file.path));
      stage.appendChild(img);
    }

    function showVideo(stage, file, rows, actions) {
      const s = t();
      const video = el('video', 'images-preview-video');
      video.controls = true;
      video.preload = 'metadata';
      video.poster = thumbURL(file.path, 512);
      video.src = fileURL(file.path);
      const length = el('span', null, '…');
      const dims = el('span', null, '…');
      rows.push([s.duration, length], [s.dimensions, dims]);
      video.addEventListener('loadedmetadata', () => {
        length.textContent = clock(video.duration);
        dims.textContent = video.videoWidth ? `${video.videoWidth} × ${video.videoHeight}` : '';
      });
      // A codec Chromium does not carry, such as ProRes, still has a poster
      // from Quick Look; the person is offered the app macOS would use.
      video.addEventListener('error', () => {
        const poster = el('img');
        poster.alt = '';
        poster.src = thumbURL(file.path, 512);
        video.replaceWith(poster);
        length.textContent = '';
        dims.textContent = s.cannotPlay;
        actions.prepend(button('button', 'external', s.openDefault, null, () => window.turink.openDefault(file.path)));
      });
      stage.appendChild(video);
    }

    function showPdf(stage, file, rows) {
      const s = t();
      // Chromium's own PDF viewer, without its toolbar, so the pages scroll
      // inside the preview like any other content.
      const pages = el('iframe', 'images-preview-pdf');
      pages.src = `${fileURL(file.path)}#toolbar=0&navpanes=0&view=FitH`;
      pages.title = file.name;
      stage.classList.add('pdf');
      stage.appendChild(pages);
      const count = el('span', null, '…');
      rows.push([s.pages, count]);
      // Spotlight knows the page count; a folder it does not index leaves the
      // row out rather than showing an empty one.
      window.turink.imageFacts(file.path).then((f) => {
        if (f && f.pages) count.textContent = format(s.pageCount, { count: f.pages });
        else if (count.parentNode) {
          count.parentNode.previousSibling.remove();
          count.parentNode.remove();
        }
      });
    }

    function showFile(file) {
      const s = t();
      const { stage, info } = frame();
      const rows = [];
      const actions = el('div', 'images-actions');
      if (file.type === 'video') showVideo(stage, file, rows, actions);
      else if (file.type === 'pdf') showPdf(stage, file, rows);
      else showPhoto(stage, file, rows);

      info.appendChild(el('div', 'images-preview-name', file.name));
      if (file.bytes !== undefined) rows.push([s.fileSize, formatBytes(file.bytes)]);
      if (file.modified) rows.push([s.modified, new Date(file.modified).toLocaleString()]);
      if (file.folder) rows.push([s.location, file.folder]);
      facts(info, rows);
      actions.append(pickButton(file), button('button primary', 'external', s.openViewer, '↵', () => deps.openViewer(file.path)));
      info.appendChild(actions);
    }

    return {
      // entry: { folder } or { file }, with the folder's count when known.
      show(entry, count) {
        if (!entry) {
          stop();
          shown = null;
          pane.textContent = '';
          const stage = el('div', 'images-preview-stage');
          stage.appendChild(el('div', 'images-empty', t().previewEmpty));
          pane.appendChild(stage);
          return;
        }
        shown = entry.folder || entry.file;
        if (entry.folder) showFolder(entry.folder, count);
        else showFile(entry.file);
      },
      // The pick button changes without reloading the photo or the video.
      refreshPick(file) {
        if (!shown || shown.path !== file.path || shown.type === undefined) return;
        const old = pane.querySelector('.images-actions .button[aria-pressed]');
        if (old) old.replaceWith(pickButton(file));
      },
      stop,
    };
  }

  window.TurinkImagesPreview = { createPreview, countLine, clock, thumbURL, fileURL };
})();
