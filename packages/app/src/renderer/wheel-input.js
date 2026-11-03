'use strict';

// Turns wheel events into what the person meant. A trackpad and a mouse wheel
// arrive as the same event, so the device is read from the stream itself: a
// trackpad sends small, fractional or sideways deltas many times a second, a
// mouse wheel sends whole notches. The decision is made once per gesture so the
// momentum after a swipe cannot flip it halfway.
//
// The rules follow Photos on a MacBook:
//   pinch                     always zooms around the fingers
//   trackpad, photo fitted    a sideways swipe turns one page per gesture;
//                             an up-and-down scroll does nothing
//   trackpad, photo zoomed    two fingers move the photo
//   mouse wheel               one notch turns one page, or zooms when the
//                             "wheel zooms" option is chosen; ⌘ swaps the two

(function (root) {
  const GESTURE_GAP = 180;
  const SWIPE_DISTANCE = 30;
  const NOTCH_DISTANCE = 40;
  const NOTCH_PAUSE = 120;

  function createWheel() {
    const state = { kind: 'mouse', lastAt: -Infinity, turned: false, travel: 0, pauseUntil: 0 };

    function classify(e, now) {
      if (now - state.lastAt > GESTURE_GAP) {
        state.turned = false;
        state.travel = 0;
        if (!e.ctrlKey) {
          const precise =
            e.deltaMode === 0 && (e.deltaX !== 0 || e.deltaY % 1 !== 0 || Math.abs(e.deltaY) < 12);
          state.kind = precise ? 'trackpad' : 'mouse';
        }
      }
      state.lastAt = now;
      return state.kind;
    }

    // Returns one of:
    //   { type: 'zoom', factor }   zoom around the pointer
    //   { type: 'pan', dx, dy }    move the photo
    //   { type: 'page', step }     previous (-1) or next (1) photo
    //   { type: 'none' }
    function interpret(e, { zoomed, wheel }, now) {
      const kind = classify(e, now);
      if (e.ctrlKey) return { type: 'zoom', factor: Math.exp(-e.deltaY * 0.012), kind };

      if (kind === 'trackpad') {
        if (e.metaKey) return { type: 'zoom', factor: Math.exp(-e.deltaY * 0.004), kind };
        if (zoomed) return { type: 'pan', dx: -e.deltaX, dy: -e.deltaY, kind };
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2 && !state.turned) {
          state.travel += e.deltaX;
          if (Math.abs(state.travel) >= SWIPE_DISTANCE) {
            state.turned = true;
            const step = state.travel > 0 ? 1 : -1;
            state.travel = 0;
            return { type: 'page', step, kind };
          }
        }
        return { type: 'none', kind };
      }

      const zoomWheel = wheel === 'zoom' ? !e.metaKey : e.metaKey;
      if (zoomWheel) return { type: 'zoom', factor: Math.exp(-e.deltaY * 0.0025), kind };
      if (now < state.pauseUntil) return { type: 'none', kind };
      state.travel += e.deltaY;
      if (Math.abs(state.travel) >= NOTCH_DISTANCE) {
        const step = state.travel > 0 ? 1 : -1;
        state.travel = 0;
        state.pauseUntil = now + NOTCH_PAUSE;
        return { type: 'page', step, kind };
      }
      return { type: 'none', kind };
    }

    return { interpret };
  }

  const api = { createWheel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurinkWheel = api;
})(this);
