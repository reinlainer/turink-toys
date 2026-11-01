'use strict';

// How a saved folder is named on screen, shared by the menu bar (main
// process) and the Folders screen (renderer) so the two never disagree. The
// place names come from the caller because the menu bar stays English while
// the window follows the chosen language.

(function (root) {
  // How many of the nearest parent folders a long location keeps. The last
  // folder names are the ones that tell similar paths apart, so they survive
  // and the folders just below the place are the ones cut.
  const NEAREST = 3;

  function placeName(folder, names) {
    return names[folder.source] || folder.place;
  }

  function whereLine(folder, names) {
    const parents = folder.parents.length > NEAREST ? ['…', ...folder.parents.slice(-NEAREST)] : folder.parents;
    return [placeName(folder, names), ...parents].join(' › ');
  }

  // Two entries with the same name each say what tells them apart.
  function shownName(folder, names) {
    if (folder.clash === 'place') return `${folder.name} (${placeName(folder, names)})`;
    if (folder.clash === 'parent') {
      const parent = folder.parents[folder.parents.length - 1];
      return `${folder.name} (${parent || placeName(folder, names)})`;
    }
    return folder.name;
  }

  const api = { placeName, whereLine, shownName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurinkFolderNames = api;
})(this);
