'use strict';

// Tasks no screen has claimed yet. They get the form generated from their
// manifest, which is what keeps a newly added task reachable from the window
// before anyone designs a screen for it.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  screens.push({
    id: 'other',
    icon: 'other',
    tasks: [],

    mount(root, ctx) {
      const { el, s } = ctx;
      const tasks = this.tasks.map(ctx.taskById).filter(Boolean);
      let chosen = tasks[0];
      let state = {};

      root.appendChild(ctx.header(s().nav.other, s().other.subtitle));
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

      if (chosen) render();
    },
  });
})();
