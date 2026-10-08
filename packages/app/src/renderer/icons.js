'use strict';

// Line icons drawn on a 20-unit grid with the current text colour, so they
// follow the theme and the selected state without a second set. The markup is
// fixed here and never built from outside input.

(function () {
  const PATHS = {
    archive:
      '<rect x="3" y="4" width="14" height="4" rx="1"/><path d="M4.5 8v7.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8"/><path d="M8.5 11h3"/>',
    disk:
      '<ellipse cx="10" cy="5.5" rx="6.5" ry="2.5"/><path d="M3.5 5.5v9c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-9"/><path d="M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5"/>',
    apps:
      '<rect x="3" y="3" width="5.5" height="5.5" rx="1.4"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1.4"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1.4"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.4"/>',
    power:
      '<path d="M15.5 12.2A6.5 6.5 0 0 1 7.8 4.5a6.5 6.5 0 1 0 7.7 7.7z"/>',
    other: '<circle cx="5" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/>',
    activity: '<path d="M2.5 10h3l2-5 3.5 10 2-5h4.5"/>',
    close: '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>',
    drop: '<path d="M10 3.5v9"/><path d="M6.5 9l3.5 3.5L13.5 9"/><path d="M3.5 13.5v1.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-1.5"/>',
    file: '<path d="M5.5 2.5h6l3.5 3.5v10.5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z"/><path d="M11.5 2.5V6H15"/>',
    folder: '<path d="M2.5 6V15a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1H10L8.5 4.5h-5a1 1 0 0 0-1 1z"/>',
    zip: '<path d="M5.5 2.5h9a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z"/><path d="M10 2.5v2M10 6v2M10 9.5v2"/><rect x="8.5" y="12.5" width="3" height="2.5" rx=".5"/>',
    check: '<path d="M4.5 10.5l3.5 3.5 7.5-8"/>',
    alert: '<path d="M10 3l7.5 13.5h-15z"/><path d="M10 8.5v3.5M10 14.2v.3"/>',
    undo: '<path d="M7.5 5L4 8.5 7.5 12"/><path d="M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9"/>',
    search: '<circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5l4 4"/>',
    terminal: '<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M6 8l2.5 2L6 12M10.5 12.5H14"/>',
    chevron: '<path d="M7.5 5l5 5-5 5"/>',
    lid: '<rect x="4" y="4" width="12" height="8" rx="1"/><path d="M2 15h16"/>',
    moon: '<path d="M15.5 12.2A6.5 6.5 0 0 1 7.8 4.5a6.5 6.5 0 1 0 7.7 7.7z"/>',
    display: '<rect x="2.5" y="3.5" width="15" height="10" rx="1.5"/><path d="M7.5 17h5M10 13.5V17"/>',
  };

  function svg(name, size) {
    const body = PATHS[name] || '';
    const px = size || 18;
    return (
      `<svg viewBox="0 0 20 20" width="${px}" height="${px}" fill="none" stroke="currentColor" ` +
      `stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
    );
  }

  function icon(name, className, size) {
    const span = document.createElement('span');
    span.className = 'icon' + (className ? ` ${className}` : '');
    span.innerHTML = svg(name, size);
    return span;
  }

  // Static markup in the page marks an icon slot with data-icon.
  function hydrate(root) {
    for (const node of (root || document).querySelectorAll('[data-icon]')) {
      node.innerHTML = svg(node.dataset.icon, Number(node.dataset.size) || undefined);
    }
  }

  window.TurinkIcons = { icon, svg, hydrate };
})();
