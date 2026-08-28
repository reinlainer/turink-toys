'use strict';

// The panel takes its text from the main process like every other surface, so
// it needs no strings of its own and gains a language when the locale files do.

(function () {
  const set = (id, text) => {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  };

  window.turink.about().then((info) => {
    document.getElementById('about-icon').src = info.icon;
    set('about-name', info.name);
    set('about-version', `${info.version} (${info.platform})`);
    set('about-tagline', info.tagline);
    set('label-home', info.labels.homepage);
    set('label-source', info.labels.source);
    set('about-license', info.license);

    for (const [id, url] of [
      ['link-home', info.homepage],
      ['link-source', info.source],
    ]) {
      const node = document.getElementById(id);
      // The row shows a shortened address, so the full one lives in the tooltip
      // rather than being lost.
      node.title = url;
      node.addEventListener('click', (event) => {
        event.preventDefault();
        window.turink.openExternal(url);
      });
    }
  });
})();
