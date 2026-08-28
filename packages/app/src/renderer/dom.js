'use strict';

// The one helper every renderer module needs. Building nodes rather than
// assigning innerHTML keeps task titles and file paths from being read as
// markup, which matters because both come from outside the window.

(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  window.TurinkDom = { el };
})();
