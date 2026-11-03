'use strict';

// Where a photo sits in the viewer, as plain numbers so the rules can be tested
// without a window. A view is { scale, cx, cy }: the photo's scale and how far
// its centre is from the centre of the window.

(function (root) {
  const MAX_SCALE = 16;

  // Fitting never enlarges a photo smaller than the window; it is shown at
  // its own size instead of blown up.
  function fitScale(photo, port) {
    return Math.min(port.width / photo.width, port.height / photo.height, 1);
  }

  function widthScale(photo, port) {
    return port.width / photo.width;
  }

  // A photo larger than the window can be moved until its edge meets the
  // window's edge; a smaller one stays centred.
  function clamp(view, photo, port) {
    const mx = Math.max(0, (photo.width * view.scale - port.width) / 2);
    const my = Math.max(0, (photo.height * view.scale - port.height) / 2);
    return {
      scale: view.scale,
      cx: Math.max(-mx, Math.min(mx, view.cx)),
      cy: Math.max(-my, Math.min(my, view.cy)),
    };
  }

  function modeView(mode, photo, port) {
    if (mode === 'width') {
      const scale = widthScale(photo, port);
      // Fitting the width starts at the top of the photo, where reading begins.
      return clamp({ scale, cx: 0, cy: (photo.height * scale - port.height) / 2 }, photo, port);
    }
    return { scale: mode === 'actual' ? 1 : fitScale(photo, port), cx: 0, cy: 0 };
  }

  // Zooms so the point under the pointer stays under it. The point is given
  // relative to the window's top left corner.
  function zoomAt(view, next, point, photo, port) {
    const scale = Math.max(fitScale(photo, port) * 0.5, Math.min(MAX_SCALE, next));
    const ox = point.x - port.width / 2;
    const oy = point.y - port.height / 2;
    return clamp(
      {
        scale,
        cx: ox - ((ox - view.cx) * scale) / view.scale,
        cy: oy - ((oy - view.cy) * scale) / view.scale,
      },
      photo,
      port
    );
  }

  function pan(view, dx, dy, photo, port) {
    return clamp({ scale: view.scale, cx: view.cx + dx, cy: view.cy + dy }, photo, port);
  }

  function larger(view, photo, port) {
    return photo.width * view.scale > port.width + 1 || photo.height * view.scale > port.height + 1;
  }

  // Which named mode a view is in, so the label can say "Fit" rather than a
  // bare percentage.
  function modeOf(view, photo, port) {
    if (Math.abs(view.scale - fitScale(photo, port)) < 1e-4) return 'fit';
    if (Math.abs(view.scale - 1) < 1e-4) return 'actual';
    if (Math.abs(view.scale - widthScale(photo, port)) < 1e-4) return 'width';
    return 'free';
  }

  const api = { fitScale, widthScale, clamp, modeView, zoomAt, pan, larger, modeOf, MAX_SCALE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurinkViewerMath = api;
})(this);
