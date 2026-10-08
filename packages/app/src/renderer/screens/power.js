'use strict';

// The current power state and the two ways of changing it. Keeping the Mac
// awake with the lid open needs no rights; with the lid closed it changes a
// system setting, so it goes through the macOS administrator prompt.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  const KEEP_AWAKE_CHOICES = [30, 60, 120, 240];
  const LID_CHOICES = [60, 120, 240, 480];

  screens.push({
    id: 'power',
    icon: 'power',
    tasks: ['power.status', 'power.keep-awake', 'power.lid'],

    mount(root, ctx) {
      const { el, icon, s, format } = ctx;
      const t = () => s().power;
      const state = { status: null, keepAwakeMinutes: 60, lidMinutes: 120 };

      root.appendChild(ctx.header(s().nav.power, t().subtitle));
      const tiles = el('section', 'tiles');
      const keepCard = el('section', 'card setting-card');
      const lidCard = el('section', 'card setting-card');
      root.append(tiles, keepCard, lidCard);

      const duration = (minutes) =>
        minutes % 60 === 0 ? format(t().hours, { hours: minutes / 60 }) : format(t().minutes, { minutes });
      const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      async function refresh() {
        const outcome = await ctx.peek('power.status');
        if (outcome.ok) state.status = outcome.result;
        render();
      }

      function tile(iconName, label, value, note, tone) {
        const node = el('div', 'tile' + (tone ? ` ${tone}` : ''));
        node.appendChild(icon(iconName, 'tile-icon'));
        node.appendChild(el('span', 'tile-label', label));
        node.appendChild(el('span', 'tile-value', value));
        if (note) node.appendChild(el('span', 'tile-note', note));
        return node;
      }

      function renderTiles() {
        tiles.textContent = '';
        const st = state.status;
        if (!st) return;
        tiles.appendChild(
          tile(
            'lid',
            t().lidState,
            st.lidSleepDisabled ? t().lidAwake : t().lidSleeps,
            st.lidSleepDisabled && st.lidRestoreScheduled ? t().lidRestoreScheduled : null,
            st.lidSleepDisabled ? 'on' : null
          )
        );
        tiles.appendChild(
          tile(
            'moon',
            t().idleState,
            st.keepAwake.active ? format(t().idlePrevented, { minutes: st.keepAwake.minutesLeft }) : t().idleNormal,
            null,
            st.keepAwake.active ? 'on' : null
          )
        );
        tiles.appendChild(
          tile(
            'display',
            t().displayState,
            st.displaySleepMinutes ? format(t().minutes, { minutes: st.displaySleepMinutes }) : t().displayNever
          )
        );
      }

      function choices(values, chosen, onPick) {
        const group = el('div', 'segmented small');
        for (const value of values) {
          const button = el('button', 'segment', duration(value));
          button.type = 'button';
          button.setAttribute('aria-pressed', String(chosen === value));
          button.addEventListener('click', () => onPick(value));
          group.appendChild(button);
        }
        return group;
      }

      function settingCard(card, { title, body, warning, active, activeText, values, chosen, onPick, onStart, onStop }) {
        card.textContent = '';
        card.classList.toggle('active', active);
        const head = el('div', 'setting-head');
        const text = el('div', 'setting-text');
        text.appendChild(el('h2', null, title));
        text.appendChild(el('p', null, body));
        if (warning) text.appendChild(el('p', 'warning', warning));
        head.appendChild(text);
        card.appendChild(head);

        const controls = el('div', 'setting-controls');
        if (active) {
          const status = el('span', 'status-on');
          status.appendChild(el('span', 'status-dot'));
          status.appendChild(el('span', null, activeText));
          controls.appendChild(status);
          const stop = el('button', 'button', t().turnOff);
          stop.type = 'button';
          stop.addEventListener('click', onStop);
          controls.appendChild(stop);
        } else {
          controls.appendChild(el('span', 'muted', t().duration));
          controls.appendChild(choices(values, chosen, onPick));
          const start = el('button', 'button primary', t().turnOn);
          start.type = 'button';
          start.addEventListener('click', onStart);
          controls.appendChild(start);
        }
        card.appendChild(controls);
      }

      function render() {
        renderTiles();
        const st = state.status || { keepAwake: { active: false }, lidSleepDisabled: false };

        settingCard(keepCard, {
          title: t().keepAwakeTitle,
          body: t().keepAwakeBody,
          active: st.keepAwake.active,
          activeText: st.keepAwake.active && st.keepAwake.expiresAt ? format(t().keepAwakeActive, { time: clock(st.keepAwake.expiresAt) }) : '',
          values: KEEP_AWAKE_CHOICES,
          chosen: state.keepAwakeMinutes,
          onPick: (value) => {
            state.keepAwakeMinutes = value;
            render();
          },
          onStart: async () => {
            await ctx.run('power.keep-awake', { minutes: state.keepAwakeMinutes }, { label: t().keepAwakeLabel });
            refresh();
          },
          onStop: async () => {
            await ctx.run('power.keep-awake', { off: true }, { label: t().keepAwakeLabel });
            refresh();
          },
        });

        settingCard(lidCard, {
          title: t().lidTitle,
          body: t().lidBody,
          warning: t().lidWarning,
          active: st.lidSleepDisabled,
          activeText: t().lidActive,
          values: LID_CHOICES,
          chosen: state.lidMinutes,
          onPick: (value) => {
            state.lidMinutes = value;
            render();
          },
          onStart: async () => {
            await ctx.runElevated('power.lid', { sleep: 'off', minutes: state.lidMinutes }, t().lidLabel);
            refresh();
          },
          onStop: async () => {
            await ctx.runElevated('power.lid', { sleep: 'on' }, t().lidLabel);
            refresh();
          },
        });
      }

      render();
      refresh();
      // The remaining time counts down, so the tiles are re-read while shown.
      const timer = setInterval(refresh, 30000);
      this.unmount = () => clearInterval(timer);
    },
  });
})();
