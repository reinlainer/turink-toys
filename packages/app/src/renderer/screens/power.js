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

      // The sleep and display values belong to the power source in use, and a
      // laptop keeps different ones on the adapter and on battery.
      const sourceNote = (st) =>
        st.powerSource === 'ac' ? t().sourceAdapter : st.powerSource === 'battery' ? t().sourceBattery : null;

      // Mirrors power.status: no sleep timer means never, and one at or below
      // the display timer means the Mac sleeps when the display turns off.
      function autoSleep(st) {
        if (!st.systemSleepMinutes) return t().autoSleepNever;
        if (st.displaySleepMinutes && st.systemSleepMinutes <= st.displaySleepMinutes) return t().autoSleepWithDisplay;
        return format(t().autoSleepAfter, { minutes: st.systemSleepMinutes });
      }

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
            st.lidSleepDisabled && st.lidRestoreAt ? format(t().lidRestoreScheduled, { time: clock(st.lidRestoreAt) }) : null,
            st.lidSleepDisabled ? 'on' : null
          )
        );
        tiles.appendChild(
          tile(
            'moon',
            t().idleState,
            st.keepAwake.active ? format(t().idlePrevented, { minutes: st.keepAwake.minutesLeft }) : t().idleNormal,
            st.keepAwake.active ? null : format(t().autoSleep, { value: autoSleep(st) }),
            st.keepAwake.active ? 'on' : null
          )
        );
        tiles.appendChild(
          tile(
            'display',
            t().displayState,
            st.displaySleepMinutes ? format(t().minutes, { minutes: st.displaySleepMinutes }) : t().displayNever,
            sourceNote(st)
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

      function settingCard(card, { title, points, warning, active, activeText, values, chosen, onPick, onStart, onStop }) {
        card.textContent = '';
        card.classList.toggle('active', active);
        const head = el('div', 'setting-head');
        const text = el('div', 'setting-text');
        text.appendChild(el('h2', null, title));
        // Points are one string with a line per item, because a translation
        // only ever replaces strings and may need a different number of lines.
        const lines = (points || '').split('\n').filter(Boolean);
        if (lines.length > 0) {
          const list = el('ul', 'setting-points');
          for (const line of lines) list.appendChild(el('li', null, line));
          text.appendChild(list);
        }
        if (warning) text.appendChild(el('p', 'warning', warning));
        head.appendChild(text);

        // The switch shows the state read back from the system, so a cancelled
        // administrator prompt leaves it where it was once the status refreshes.
        const toggle = el('input', 'switch');
        toggle.type = 'checkbox';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-label', title);
        toggle.checked = active;
        toggle.addEventListener('change', async () => {
          toggle.disabled = true;
          await (toggle.checked ? onStart() : onStop());
        });
        head.appendChild(toggle);
        card.appendChild(head);

        const controls = el('div', 'setting-controls');
        if (active) {
          const status = el('span', 'status-on');
          status.appendChild(el('span', 'status-dot'));
          status.appendChild(el('span', null, activeText));
          controls.appendChild(status);
        } else {
          controls.appendChild(el('span', 'muted', t().duration));
          controls.appendChild(choices(values, chosen, onPick));
        }
        card.appendChild(controls);
      }

      function render() {
        renderTiles();
        const st = state.status || { keepAwake: { active: false }, lidSleepDisabled: false };

        settingCard(keepCard, {
          title: t().keepAwakeTitle,
          points: t().keepAwakePoints,
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
          points: t().lidPoints,
          warning: t().lidWarning,
          active: st.lidSleepDisabled,
          activeText: st.lidRestoreAt ? format(t().lidActive, { time: clock(st.lidRestoreAt) }) : t().lidActiveNoRestore,
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
