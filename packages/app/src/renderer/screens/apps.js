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
        const paths = new Set(
          state.apps.filter((app) => !app.running && !(app.cloudStorage || []).length).map((app) => app.path)
        );
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
          // A cloud account has to be disconnected in the app before removal,
          // so such an app is held back the same way a running one is.
          const cloud = (app.cloudStorage || []).length > 0;
          const blocked = app.running || cloud;
          const row = el('label', 'row' + (blocked ? ' disabled' : ''));
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.disabled = blocked;
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
          if (cloud) title.appendChild(el('span', 'badge', t().cloudConnected));
          text.appendChild(title);
          const note = app.running ? t().runningNote : cloud ? t().cloudNote : tilde(app.path);
          text.appendChild(el('span', 'row-note', note));
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

      const sizeText = (item) => (item.sizeUnknown ? t().sizeUnknown : item.bytes ? formatBytes(item.bytes) : '');

      function planBody(plan) {
        const body = el('div', 'plan-body');
        const list = el('div', 'plan-list');
        for (const item of plan.items) {
          // Not plain "app": that class lays out the whole window.
          const line = el('div', 'plan-row' + (item.kind === 'app' ? ' is-app' : ''));
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
            if (item.protected) text.appendChild(el('span', 'badge', t().protectedBadge));
          }
          line.appendChild(text);
          line.appendChild(el('span', 'plan-size', sizeText(item)));
          list.appendChild(line);
        }
        body.appendChild(list);

        const guarded = plan.items.filter((item) => item.protected).length;
        if (guarded > 0) body.appendChild(el('p', 'plan-note', format(t().protectedNote, { count: guarded })));

        // Folders another app of the same vendor also declares stay where they
        // are; they are shown so the person knows they were considered.
        const kept = plan.kept || [];
        if (kept.length > 0) {
          body.appendChild(el('h3', 'plan-heading', t().keptTitle));
          const keptList = el('div', 'plan-list kept');
          for (const entry of kept) {
            const line = el('div', 'plan-row');
            const text = el('div', 'plan-text');
            text.appendChild(el('span', 'plan-path', tilde(entry.path).replace(/^~\/Library\//, '')));
            text.appendChild(el('span', 'plan-shared', format(t().sharedWith, { apps: sharedNames(entry.sharedWith) })));
            line.appendChild(text);
            keptList.appendChild(line);
          }
          body.appendChild(keptList);
        }
        return body;
      }

      function sharedNames(names) {
        const list = names || [];
        if (list.length <= 2) return list.join(', ');
        return format(t().sharedWithMore, { first: list.slice(0, 2).join(', '), count: list.length - 2 });
      }

      async function remove() {
        const outcome = await ctx.run('apps.uninstall', input(), {
          confirm: (plan) =>
            ctx.sheet.open({
              title: t().confirmTitle,
              message: `${t().confirmMessage}\n${format(plan.sizeUnknown ? t().totalSizeAtLeast : t().totalSize, {
                size: formatBytes(plan.bytes || 0),
              })}`,
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
        explainProtected(outcome.result);
      }

      // Folders macOS keeps from other apps are left behind rather than
      // retried. The notice leads with what did happen, the app going to the
      // Trash, so a partial run is not read as a failed one, then says where
      // the folders are and how to clear them.
      async function explainProtected(result) {
        const kept = ((result && result.failed) || []).filter((item) => item.protected).map((item) => item.path);
        if (kept.length === 0) return;
        const removed = ((result && result.apps) || []).length > 0;
        const reveal = await ctx.sheet.open({
          title: format(removed ? t().protectedTitleRemoved : t().protectedTitle, { count: kept.length }),
          message: t().protectedMessage,
          detail: kept.map(tilde).join('\n'),
          accept: t().protectedReveal,
          wide: true,
        });
        if (reveal) window.turink.revealFiles(kept);
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
