'use strict';

// Small tools that do not justify a screen of their own sit here as cards, and
// move out to their own screen once they grow. Below them, tasks no screen has
// claimed get the form generated from their manifest, which is what keeps a
// newly added task reachable from the window before anyone designs for it.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  // While the helper is starting or waiting for permission the state changes
  // without the window doing anything, so it is read again until it settles.
  const PENDING = ['starting', 'needs-permission', 'stopped'];

  screens.push({
    id: 'other',
    icon: 'other',
    // The cards' own tasks. app.js appends the unclaimed ones as `generated`.
    tasks: ['mouse.status', 'mouse.reverse'],

    mount(root, ctx) {
      const { s } = ctx;
      root.appendChild(ctx.header(s().nav.other, s().other.subtitle));

      let timer = null;
      if (ctx.taskById('mouse.reverse')) timer = mountWheelCard(root, ctx);
      mountGenerated(root, ctx, (this.generated || []).map(ctx.taskById).filter(Boolean));
      this.unmount = () => clearTimeout(timer && timer.id);
    },
  });

  function mountWheelCard(root, ctx) {
    const { el, s } = ctx;
    const t = () => s().other;
    const card = el('section', 'card setting-card');
    root.appendChild(card);
    let status = null;
    const timer = { id: null };

    async function refresh() {
      clearTimeout(timer.id);
      const outcome = await ctx.peek('mouse.status');
      if (outcome.ok) status = outcome.result;
      render();
      if (status && PENDING.includes(status.helper)) timer.id = setTimeout(refresh, 2000);
    }

    function render() {
      const on = Boolean(status && status.reversing);
      const helper = (status && status.helper) || 'off';
      card.textContent = '';
      card.classList.toggle('active', helper === 'active');

      const head = el('div', 'setting-head');
      const text = el('div', 'setting-text');
      text.appendChild(el('h2', null, t().wheelTitle));
      const list = el('ul', 'setting-points');
      // One string with a line per item, so a translation may use a different
      // number of lines.
      for (const line of t().wheelPoints.split('\n').filter(Boolean)) list.appendChild(el('li', null, line));
      text.appendChild(list);
      head.appendChild(text);

      // The switch shows the state read back from the core, not the click, so
      // a failed run leaves it where it was.
      const toggle = el('input', 'switch');
      toggle.type = 'checkbox';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', t().wheelTitle);
      toggle.checked = on;
      toggle.disabled = !status;
      toggle.addEventListener('change', async () => {
        toggle.disabled = true;
        await ctx.run('mouse.reverse', toggle.checked ? {} : { off: true }, { label: t().wheelTitle });
        refresh();
      });
      head.appendChild(toggle);
      card.appendChild(head);

      if (!on) return;
      const controls = el('div', 'setting-controls');
      if (helper === 'active') {
        const state = el('span', 'status-on');
        state.appendChild(el('span', 'status-dot'));
        state.appendChild(el('span', null, t().wheelActive));
        controls.appendChild(state);
      } else if (helper === 'needs-permission') {
        const box = el('div', 'setting-text');
        box.appendChild(el('p', 'warning', t().wheelNeedsPermission));
        controls.appendChild(box);
        const open = el('button', 'button', t().wheelOpenSettings);
        open.type = 'button';
        open.addEventListener('click', () => window.turink.openSettings('accessibility'));
        controls.appendChild(open);
      } else if (helper === 'stopped') {
        controls.appendChild(el('p', 'warning', t().wheelStopped));
      } else {
        controls.appendChild(el('span', 'muted', t().wheelStarting));
      }
      card.appendChild(controls);
    }

    render();
    refresh();
    return timer;
  }

  function mountGenerated(root, ctx, tasks) {
    if (tasks.length === 0) return;
    const { el, s } = ctx;
    let chosen = tasks[0];
    let state = {};

    const tabs = el('div', 'segmented');
    const card = el('section', 'card action-card');
    const results = el('section', 'results');
    root.append(tabs, card, results);

    const formContext = {
      strings: s(),
      lastOptions: [],
      async pickOptions(rule, current, multiple) {
        const { values, options } = await ctx.sheet.pickOptions(rule, current, multiple);
        formContext.lastOptions = options;
        return values;
      },
    };

    function renderTabs() {
      tabs.textContent = '';
      tabs.hidden = tasks.length < 2;
      for (const task of tasks) {
        const tab = el('button', 'segment', task.title);
        tab.type = 'button';
        tab.setAttribute('aria-pressed', String(task === chosen));
        tab.addEventListener('click', () => {
          chosen = task;
          render();
        });
        tabs.appendChild(tab);
      }
    }

    function render() {
      renderTabs();
      state = window.TurinkForm.initialState(chosen);
      card.textContent = '';
      card.appendChild(el('p', 'action-hint', chosen.whenToUse));
      const form = el('div', 'form');
      const go = el('button', 'button primary large', s().run);
      const refresh = () => {
        go.disabled = !window.TurinkForm.isRunnable(chosen, state);
      };
      form.appendChild(window.TurinkForm.build(chosen, state, refresh, formContext));
      card.appendChild(form);

      const bar = el('div', 'action-bar');
      go.type = 'button';
      go.addEventListener('click', async () => {
        const outcome = await ctx.run(chosen.id, state);
        if (outcome.ok) results.insertBefore(ctx.resultCard(outcome.shown, { title: chosen.title }), results.firstChild);
      });
      bar.append(go, ctx.commandButton(() => ctx.command(chosen.id, state)));
      card.appendChild(bar);
      refresh();
    }

    render();
  }
})();
