'use strict';

// Installed applications, their removal and its undo on one screen. The list
// is apps.list; what a removal would take with it is only known once the core
// computes the plan, so the confirmation shows it grouped by application.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  const tilde = (target) => target.replace(/^\/Users\/[^/]+\//, '~/');

  screens.push({
    id: 'apps',
    icon: 'apps',
    tasks: ['apps.list', 'apps.uninstall', 'apps.restore'],

    mount(root, ctx) {
      const { el, icon, s, format, formatBytes } = ctx;
      const t = () => s().apps;

      const state = { apps: [], query: '', selected: new Set(), keepData: false, recent: [], loaded: false };
      const icons = new Map();

      root.appendChild(ctx.header(s().nav.apps, t().subtitle));

      const listCard = el('section', 'card list-card');
      const bar = el('section', 'sticky-bar');
      const recent = el('section', 'card recent-card');
      root.append(listCard, bar, recent);

      const toolbar = el('div', 'list-toolbar');
      const search = el('label', 'search');
      search.appendChild(icon('search', null, 15));
      const field = document.createElement('input');
      field.type = 'search';
      field.placeholder = t().search;
      field.addEventListener('input', () => {
        state.query = field.value.trim().toLowerCase();
        renderRows();
      });
      search.appendChild(field);
      const count = el('span', 'muted');
      toolbar.append(search, count);
      const rows = el('div', 'rows');
      listCard.append(toolbar, rows);

      // ------------------------------------------------ data

      async function load() {
        const outcome = await ctx.peek('apps.list');
        state.loaded = true;
        if (!outcome.ok) return;
        state.apps = outcome.result.apps;
        const paths = new Set(state.apps.map((app) => app.path));
        for (const chosen of [...state.selected]) if (!paths.has(chosen)) state.selected.delete(chosen);
        renderRows();
        renderBar();
      }

      async function loadRecent() {
        state.recent = await window.turink.listUndoable('apps.uninstall');
        renderRecent();
      }

      function appIcon(appPath) {
        const img = document.createElement('img');
        img.className = 'app-icon';
        img.alt = '';
        const known = icons.get(appPath);
        if (known) img.src = known;
        else {
          window.turink.appIcon(appPath).then((url) => {
            if (!url) return;
            icons.set(appPath, url);
            img.src = url;
          });
        }
        return img;
      }

      // ------------------------------------------------ list

      function renderRows() {
        rows.textContent = '';
        const shown = state.apps.filter(
          (app) =>
            !state.query ||
            app.name.toLowerCase().includes(state.query) ||
            (app.bundleId || '').toLowerCase().includes(state.query)
        );
        count.textContent = state.loaded ? format(t().count, { count: state.apps.length }) : '';

        if (state.loaded && shown.length === 0) {
          rows.appendChild(el('p', 'empty', t().noMatch));
          return;
        }

        for (const app of shown) {
          const row = el('label', 'row' + (app.running ? ' disabled' : ''));
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.disabled = app.running;
          box.checked = state.selected.has(app.path);
          box.addEventListener('change', () => {
            if (box.checked) state.selected.add(app.path);
            else state.selected.delete(app.path);
            renderBar();
          });
          row.append(box, appIcon(app.path));

          const text = el('div', 'row-text');
          const title = el('div', 'row-title');
          title.appendChild(el('span', null, app.name));
          if (app.version) title.appendChild(el('span', 'version', app.version));
          if (app.running) title.appendChild(el('span', 'badge', t().running));
          text.appendChild(title);
          text.appendChild(el('span', 'row-note', app.running ? t().runningNote : tilde(app.path)));
          row.appendChild(text);
          rows.appendChild(row);
        }
      }

      // ------------------------------------------------ action bar

      function input() {
        return { apps: [...state.selected], keepData: state.keepData };
      }

      function renderBar() {
        bar.textContent = '';
        const chosen = state.selected.size;
        bar.appendChild(
          el('span', 'bar-summary', chosen === 0 ? t().nothingSelected : format(t().selection, { count: chosen }))
        );
        const keep = el('label', 'check subtle');
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = state.keepData;
        box.addEventListener('change', () => (state.keepData = box.checked));
        keep.append(box, el('span', null, t().keepData));
        bar.appendChild(keep);
        bar.appendChild(ctx.commandButton(() => (chosen ? ctx.command('apps.uninstall', input()) : '')));
        const go = el('button', 'button danger', t().remove);
        go.type = 'button';
        go.disabled = chosen === 0;
        go.addEventListener('click', remove);
        bar.appendChild(go);
      }

      function planBody(plan) {
        const list = el('div', 'plan-list');
        for (const item of plan.items) {
          const line = el('div', 'plan-row' + (item.kind === 'app' ? ' app' : ''));
          if (item.kind === 'app') line.appendChild(appIcon(item.path));
          const text = el('div', 'plan-text');
          if (item.kind === 'app') {
            text.appendChild(el('span', 'plan-name', item.app));
            text.appendChild(el('span', 'plan-path', tilde(item.path)));
          } else {
            const name = el('span', 'plan-path');
            name.textContent = tilde(item.path).replace(/^~\/Library\//, '');
            text.appendChild(name);
            if (item.basis === 'name') text.appendChild(el('span', 'badge warn', t().nameOnly));
          }
          line.appendChild(text);
          line.appendChild(el('span', 'plan-size', item.bytes ? formatBytes(item.bytes) : ''));
          list.appendChild(line);
        }
        return list;
      }

      async function remove() {
        const outcome = await ctx.run('apps.uninstall', input(), {
          confirm: (plan) =>
            ctx.sheet.open({
              title: t().confirmTitle,
              message: `${t().confirmMessage}\n${format(t().totalSize, { size: formatBytes(plan.bytes || 0) })}`,
              body: planBody(plan),
              accept: s().moveToTrash,
              tone: 'danger',
              wide: true,
            }),
        });
        if (!outcome.ok) return;
        state.selected.clear();
        renderBar();
        load();
        loadRecent();
      }

      // ------------------------------------------------ recent

      function renderRecent() {
        recent.textContent = '';
        recent.appendChild(el('h2', null, t().recent));
        if (state.recent.length === 0) {
          recent.appendChild(el('p', 'empty', t().noRecent));
          return;
        }
        const list = el('div', 'rows');
        for (const entry of state.recent) {
          const row = el('div', 'row');
          row.appendChild(icon('undo', 'row-icon'));
          const text = el('div', 'row-text');
          text.appendChild(el('span', 'row-title', (entry.apps || []).join(', ')));
          text.appendChild(el('span', 'row-note', `${ctx.relativeTime(entry.startedAt)} · ${formatBytes(entry.bytes)}`));
          row.appendChild(text);
          const back = el('button', 'button small', t().putBack);
          back.type = 'button';
          back.addEventListener('click', async () => {
            back.disabled = true;
            const outcome = await ctx.run('apps.restore', { run: entry.run });
            back.disabled = false;
            if (outcome.ok) {
              load();
              loadRecent();
            }
          });
          row.appendChild(back);
          list.appendChild(row);
        }
        recent.appendChild(list);
      }

      renderRows();
      renderBar();
      renderRecent();
      load();
      loadRecent();
    },
  });
})();
