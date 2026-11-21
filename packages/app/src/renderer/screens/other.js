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
    tasks: ['mouse.status', 'mouse.reverse', 'tunnel.status', 'tunnel.enable', 'tunnel.target', 'tunnel.install', 'tunnel.uninstall'],

    mount(root, ctx) {
      const { s } = ctx;
      root.appendChild(ctx.header(s().nav.other, s().other.subtitle));

      let timer = null;
      let tunnelTimer = null;
      if (ctx.taskById('mouse.reverse')) timer = mountWheelCard(root, ctx);
      if (ctx.taskById('tunnel.status')) tunnelTimer = mountTunnelCard(root, ctx);
      mountGenerated(root, ctx, (this.generated || []).map(ctx.taskById).filter(Boolean));
      // A refresh already waiting on the core when the screen closes would
      // otherwise schedule itself again, so each timer is marked stopped.
      this.unmount = () => {
        for (const t of [timer, tunnelTimer]) {
          if (!t) continue;
          t.stopped = true;
          clearTimeout(t.id);
        }
      };
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
      if (timer.stopped) return;
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

  // The proxy tunnel card. The daemon decides on its own when the tunnel is up,
  // so the card reads the state every two seconds while it is on screen and
  // shows what it reads, never what it assumed after a click.
  const DIRECTBRIDGE = { server: '192.168.49.1', port: 8282 };

  function mountTunnelCard(root, ctx) {
    const { el, s } = ctx;
    const t = () => s().other;
    const card = el('section', 'card setting-card tunnel-card');
    root.appendChild(card);
    const timer = { id: null };
    let status = null;
    let installing = false; // the switch was turned on before the tunnel was installed
    let removedNote = false;
    let draft = null; // server and port being edited, before Save

    async function refresh() {
      clearTimeout(timer.id);
      const outcome = await ctx.peek('tunnel.status');
      if (timer.stopped) return;
      if (outcome.ok) status = outcome.result;
      // Typing in a field must not be undone by a redraw.
      if (!card.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') render();
      timer.id = setTimeout(refresh, 2000);
    }

    // The wording of the time lives in the strings, so a locale can spell it
    // out (오후 2시 42분) or keep the clock form (2:42 PM).
    function since(iso) {
      const d = new Date(iso);
      const hour = d.getHours() % 12 || 12;
      return t().tunnelOnSince
        .replace('{period}', d.getHours() < 12 ? t().tunnelAm : t().tunnelPm)
        .replace('{hour}', hour)
        .replace('{minute}', d.getMinutes())
        .replace('{mm}', String(d.getMinutes()).padStart(2, '0'));
    }

    function statusLine(kind, title, rest) {
      const line = el('div', `tunnel-status ${kind}`);
      line.appendChild(el('span', 'status-dot'));
      line.appendChild(el('strong', null, title));
      if (rest) line.appendChild(el('span', 'muted', rest));
      return line;
    }

    function targetRow() {
      const current = draft || { server: status.server, port: String(status.port) };
      const row = el('div', 'tunnel-target');
      const field = (label, value, width, key) => {
        const box = el('label', 'tunnel-field');
        box.appendChild(el('span', null, label));
        const input = el('input');
        input.type = 'text';
        input.value = value;
        input.spellcheck = false;
        input.style.width = width;
        input.addEventListener('input', () => {
          draft = { ...current, ...(draft || {}), [key]: input.value.trim() };
          renderActions();
        });
        box.appendChild(input);
        return box;
      };
      row.appendChild(field(t().tunnelServer, current.server, '150px', 'server'));
      row.appendChild(field(t().tunnelPort, current.port, '80px', 'port'));
      const actions = el('div', 'tunnel-target-actions');
      row.appendChild(actions);

      function renderActions() {
        actions.textContent = '';
        const shown = draft || { server: status.server, port: String(status.port) };
        const isDefault = shown.server === DIRECTBRIDGE.server && Number(shown.port) === DIRECTBRIDGE.port;
        const changed = draft && (draft.server !== status.server || Number(draft.port) !== status.port);
        if (isDefault && !changed) {
          actions.appendChild(el('span', 'muted', t().tunnelDefaultNote));
          return;
        }
        if (!isDefault) {
          const reset = el('button', 'text-button', t().tunnelReset);
          reset.type = 'button';
          reset.addEventListener('click', async () => {
            draft = null;
            await ctx.run('tunnel.target', { default: true }, { label: t().tunnelTitle, quiet: true });
            refresh();
          });
          actions.appendChild(reset);
        }
        if (changed) {
          const save = el('button', 'button primary small', t().tunnelSave);
          save.type = 'button';
          save.addEventListener('click', async () => {
            const outcome = await ctx.run('tunnel.target', { server: draft.server, port: Number(draft.port) }, { label: t().tunnelTitle, quiet: true });
            if (outcome.ok) draft = null;
            refresh();
          });
          actions.appendChild(save);
        }
      }
      renderActions();
      return row;
    }

    function render() {
      card.textContent = '';
      const installed = Boolean(status && status.installed);
      const on = installed && status.enabled;
      card.classList.toggle('active', Boolean(status && status.state === 'on'));

      const head = el('div', 'setting-head');
      const text = el('div', 'setting-text');
      text.appendChild(el('h2', null, t().tunnelTitle));
      const list = el('ul', 'setting-points');
      for (const line of t().tunnelPoints.split('\n').filter(Boolean)) list.appendChild(el('li', null, line));
      text.appendChild(list);
      head.appendChild(text);

      const toggle = el('input', 'switch');
      toggle.type = 'checkbox';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', t().tunnelTitle);
      toggle.checked = on || installing;
      toggle.disabled = !status;
      toggle.addEventListener('change', async () => {
        removedNote = false;
        if (!installed) {
          installing = toggle.checked;
          render();
          return;
        }
        toggle.disabled = true;
        await ctx.run('tunnel.enable', toggle.checked ? {} : { off: true }, { label: t().tunnelTitle, quiet: true });
        refresh();
      });
      head.appendChild(toggle);
      card.appendChild(head);

      if (!status) return;

      // Turned on for the first time: one installation under the administrator prompt.
      if (!installed && installing) {
        card.appendChild(el('div', 'card-divider'));
        card.appendChild(el('p', 'notice', t().tunnelInstallBody));
        const row = el('div', 'setting-controls');
        const install = el('button', 'button primary', t().tunnelInstall);
        install.type = 'button';
        install.addEventListener('click', async () => {
          install.disabled = true;
          const outcome = await ctx.runElevated('tunnel.install', {}, t().tunnelTitle);
          installing = false;
          if (!outcome.ok) install.disabled = false;
          refresh();
        });
        const cancel = el('button', 'button', t().tunnelCancel);
        cancel.type = 'button';
        cancel.addEventListener('click', () => {
          installing = false;
          render();
        });
        row.append(install, cancel);
        card.appendChild(row);
        return;
      }

      if (!on) {
        if (removedNote) card.appendChild(el('p', 'muted tunnel-foot', t().tunnelRemoved));
        if (installed) {
          const foot = el('div', 'tunnel-foot');
          const remove = el('button', 'text-button subtle', t().tunnelRemove);
          remove.type = 'button';
          remove.addEventListener('click', async () => {
            const ok = await ctx.sheet.open({
              title: t().tunnelRemoveTitle,
              message: t().tunnelRemoveBody,
              accept: t().tunnelRemoveOk,
              tone: 'danger',
            });
            if (!ok) return;
            const outcome = await ctx.runElevated('tunnel.uninstall', {}, t().tunnelRemove);
            if (outcome.ok) removedNote = true;
            refresh();
          });
          foot.appendChild(remove);
          card.appendChild(foot);
        }
        return;
      }

      card.appendChild(el('div', 'card-divider'));
      card.appendChild(targetRow());

      const target = `${status.server}:${status.port}`;
      if (status.state === 'on') {
        card.appendChild(statusLine('on', t().tunnelOnTitle, status.since ? `· ${since(status.since)}` : null));
        const detail = el('p', 'muted');
        const parts = t().tunnelOnDetail.split('{server}');
        detail.append(parts[0], el('span', 'mono', target), parts[1] || '');
        card.appendChild(detail);
      } else if (status.state === 'problem') {
        card.appendChild(statusLine('warn', t().tunnelProblemTitle));
        const box = el('p', 'notice warn', t().tunnelProblemBody);
        if (status.isDefault) box.append(' ', t().tunnelProblemDirectBridge);
        card.appendChild(box);
      } else if (status.state === 'stopped') {
        card.appendChild(statusLine('warn', t().tunnelProblemTitle));
        card.appendChild(el('p', 'notice warn', t().tunnelStopped));
      } else {
        card.appendChild(statusLine('wait', t().tunnelWaitingTitle, `· ${t().tunnelWaitingBody}`));
        if (status.isDefault) card.appendChild(el('p', 'muted', t().tunnelWaitingDirectBridge));
      }
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
