'use strict';

// The selection rules of the Clipboard gallery, kept apart from the page so
// they can be tested without a window. Selecting works as in Photos: the first
// pick starts a selection, and from then on a plain click adds or removes one
// image instead of replacing what is chosen.

(function (root) {
  // What a left press on an image means, decided at the press because a drag
  // may follow it:
  //   'range'          Shift: select from the anchor to here, now
  //   'toggle'         the circle: flip this image now, every time it is hit
  //   'add-and-swipe'  an unselected image while selecting: add it now, and a
  //                    drag sweeps the images it passes into the selection
  //   'pick-on-click'  nothing selected yet: select it when the click lands,
  //                    so a drag takes the one file out without selecting it
  //   'drop-on-click'  a selected image: deselect it when the click lands, so
  //                    a drag takes the whole selection out instead
  //   'none'           the later presses of a double-click, which opens the
  //                    image and leaves the selection as it was
  function pressIntent({ selecting, selected, shift, onDot, repeat }) {
    if (shift) return repeat ? 'none' : 'range';
    if (onDot) return 'toggle';
    if (repeat) return 'none';
    if (!selecting) return 'pick-on-click';
    return selected ? 'drop-on-click' : 'add-and-swipe';
  }

  // The images from a to b in the order shown, both included.
  function span(order, a, b) {
    const to = order.indexOf(b);
    if (to < 0) return [];
    let from = order.indexOf(a);
    if (from < 0) from = to;
    return from <= to ? order.slice(from, to + 1) : order.slice(to, from + 1);
  }

  class Selection {
    constructor() {
      this.selected = new Set();
      // Where a Shift range grows from, and what was selected apart from it,
      // so a later Shift press can move the end of the range back and forth.
      this.anchor = null;
      this.base = new Set();
      // The image the keys act on, shown with a box. It moves without
      // changing what is selected.
      this.focus = null;
    }

    get size() {
      return this.selected.size;
    }

    has(p) {
      return this.selected.has(p);
    }

    inOrder(order) {
      return order.filter((p) => this.selected.has(p));
    }

    settle(anchor) {
      this.anchor = anchor;
      this.base = new Set(this.selected);
    }

    toggle(p) {
      if (this.selected.has(p)) this.selected.delete(p);
      else this.selected.add(p);
      this.focus = p;
      this.settle(p);
    }

    pick(p) {
      this.selected.add(p);
      this.focus = p;
      this.settle(p);
    }

    clear() {
      this.selected = new Set();
      this.settle(null);
    }

    all(order) {
      this.selected = new Set(order);
      this.settle(this.anchor);
    }

    // Selects from the anchor to p on top of what was selected before the
    // range began. Without an anchor the range starts at the focus.
    rangeTo(p, order) {
      if (!order.includes(this.anchor)) this.settle(order.includes(this.focus) ? this.focus : p);
      this.selected = new Set([...this.base, ...span(order, this.anchor, p)]);
      this.focus = p;
    }

    // A sweep that started on an unselected image: everything between the
    // start and the image under the pointer joins what was selected before.
    beginSweep(p, order) {
      this.settle(p);
      this.rangeTo(p, order);
    }

    // A rectangle drawn from empty space selects what it touches, on top of
    // the earlier selection when it adds, or on its own when it replaces.
    gather(hits, onTopOf) {
      this.selected = new Set([...onTopOf, ...hits]);
    }

    // The image a step away from the focus, kept within the list. With no
    // focus yet the first image is the start.
    stepFrom(step, order) {
      if (order.length === 0) return null;
      const at = order.indexOf(this.focus);
      return order[Math.min(Math.max(at < 0 ? 0 : at + step, 0), order.length - 1)];
    }

    snapshot() {
      return { selected: new Set(this.selected), anchor: this.anchor, base: new Set(this.base), focus: this.focus };
    }

    restore(saved) {
      this.selected = new Set(saved.selected);
      this.anchor = saved.anchor;
      this.base = new Set(saved.base);
      this.focus = saved.focus;
    }

    // Images that left the folder leave the selection too.
    prune(present) {
      for (const p of [...this.selected]) if (!present.has(p)) this.selected.delete(p);
      for (const p of [...this.base]) if (!present.has(p)) this.base.delete(p);
      if (!present.has(this.focus)) this.focus = null;
      if (!present.has(this.anchor)) this.anchor = null;
    }
  }

  // The rectangle between two points, whichever way it was drawn.
  function rectFrom(a, b) {
    return {
      left: Math.min(a.x, b.x),
      top: Math.min(a.y, b.y),
      right: Math.max(a.x, b.x),
      bottom: Math.max(a.y, b.y),
    };
  }

  // The boxes a rectangle overlaps, touching an edge included.
  function hitsIn(rect, boxes) {
    return boxes
      .filter((b) => b.left <= rect.right && b.right >= rect.left && b.top <= rect.bottom && b.bottom >= rect.top)
      .map((b) => b.path);
  }

  // How far to scroll on one frame while a drag holds the pointer near the
  // top or bottom edge: faster the closer it gets, and faster still past it.
  function edgeScroll(y, top, bottom, zone = 40, fastest = 24) {
    if (y < top + zone) return -Math.ceil(fastest * Math.min(1, (top + zone - y) / zone));
    if (y > bottom - zone) return Math.ceil(fastest * Math.min(1, (y - (bottom - zone)) / zone));
    return 0;
  }

  const api = { pressIntent, span, Selection, rectFrom, hitsIn, edgeScroll };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurinkClipSelection = api;
})(this);
