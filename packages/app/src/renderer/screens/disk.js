'use strict';

// Cleanup targets, their sizes, the cleanup itself and its undo on one screen.
// The list comes from disk.targets, which costs nothing, and the sizes fill in
// from disk.report once the walk finishes, so the screen is usable at once.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  const TARGETS = {
    task: 'disk.targets',
    list: 'targets',
    value: 'slug',
    label: 'name',
    group: 'group',
    badge: 'kind',
    note: 'consequence',
  };

  screens.push({
    id: 'disk',
    icon: 'disk',
    tasks: ['disk.targets', 'disk.report', 'disk.clean', 'disk.restore'],

    mount(root, ctx) {
      const { el, icon, s, format, formatBytes } = ctx;
      const t = () => s().disk;

      const state = {
        targets: [],
        sizes: null,
        measuredAt: null,
        measuring: false,
        selected: new Set(),
        permanent: false,
        showAbsent: false,
        recent: [],
      };

      root.appendChild(ctx.header(s().nav.disk, t().subtitle));

      const summary = el('section', 'summary-card');
      const table = el('section', 'card list-card');
      const bar = el('section', 'sticky-bar');
      const recent = el('section', 'card recent-card');
      root.append(summary, table, bar, recent);

      // ------------------------------------------------ data

      async function loadTargets() {
        state.targets = await window.turink.loadOptions(TARGETS);
        renderTable();
      }

      async function measure(refresh) {
        state.measuring = true;
        renderSummary();
        const outcome = await ctx.peek('disk.report', refresh ? { refresh: true } : {});
        state.measuring = false;
        if (outcome.ok) {
          state.sizes = new Map(outcome.result.results.map((entry) => [entry.slug, entry]));
          state.measuredAt = outcome.result.scannedAt || new Date().toISOString();
          for (const slug of [...state.selected]) if (!exists(slug)) state.selected.delete(slug);
        }
        renderSummary();
        renderTable();
        renderBar();
      }

      async function loadRecent() {
        state.recent = await window.turink.listUndoable('disk.clean');
        renderRecent();
      }

      const sizeOf = (slug) => (state.sizes && state.sizes.get(slug) ? state.sizes.get(slug).bytes : 0);
      const exists = (slug) => !state.sizes || (state.sizes.get(slug) && state.sizes.get(slug).exists !== false);
      const nameOf = (slug) => {
        const found = state.targets.find((entry) => entry.value === slug);
        return found ? found.label : slug;
      };

      // ------------------------------------------------ summary

      function renderSummary() {
        summary.textContent = '';
        const figure = el('div', 'figure');
        figure.appendChild(el('span', 'figure-label', t().total));
        const total = state.sizes ? [...state.sizes.values()].reduce((sum, entry) => sum + (entry.bytes || 0), 0) : null;
        figure.appendChild(el('span', 'figure-value', total === null ? '—' : formatBytes(total)));
        summary.appendChild(figure);

        const side = el('div', 'figure-side');
        side.appendChild(
          el(
            'span',
            'muted',
            state.measuring || !state.measuredAt
              ? t().notMeasured
              : format(t().measuredAt, { time: ctx.relativeTime(state.measuredAt) })
          )
        );
        const again = el('button', 'button small', t().measure);
        again.type = 'button';
        again.disabled = state.measuring;
        again.addEventListener('click', () => measure(true));
        side.appendChild(again);
        summary.appendChild(side);
      }

      // ------------------------------------------------ table

      function renderTable() {
        table.textContent = '';
        let group = null;
        let list = null;

        // Locations this Mac does not have are folded away once the sizes are
        // in, so the list shows what can actually be cleaned.
        const absent = state.sizes ? state.targets.filter((target) => !exists(target.value)) : [];
        const shown = state.showAbsent ? state.targets : state.targets.filter((target) => !absent.includes(target));

        for (const target of shown) {
          if (target.group !== group) {
            group = target.group;
            table.appendChild(el('h3', 'group-title', group));
            list = el('div', 'rows');
            table.appendChild(list);
          }

          const present = exists(target.value);
          const row = el('label', 'row' + (present ? '' : ' disabled'));
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.disabled = !present;
          box.checked = state.selected.has(target.value);
          box.addEventListener('change', () => {
            if (box.checked) state.selected.add(target.value);
            else state.selected.delete(target.value);
            renderBar();
          });
          row.appendChild(box);

          const text = el('div', 'row-text');
          const title = el('div', 'row-title');
          title.appendChild(el('span', null, target.label));
          title.appendChild(
            el('span', `badge ${target.badge === 'cache' ? '' : 'warn'}`, target.badge === 'cache' ? s().kindCache : s().kindToolchain)
          );
          text.appendChild(title);
          if (target.note) text.appendChild(el('span', 'row-note', target.note));
          row.appendChild(text);

          let size;
          if (!state.sizes) size = el('span', 'row-size muted', '…');
          else if (!present) size = el('span', 'row-size muted', t().notFound);
          else size = el('span', 'row-size', formatBytes(sizeOf(target.value)));
          row.appendChild(size);
          list.appendChild(row);
        }

        if (absent.length > 0) {
          const note = el('div', 'hidden-note');
          note.appendChild(el('span', null, format(t().absent, { count: absent.length })));
          const toggle = el('button', 'text-button', state.showAbsent ? t().hideAbsent : t().showAbsent);
          toggle.type = 'button';
          toggle.addEventListener('click', () => {
            state.showAbsent = !state.showAbsent;
            renderTable();
          });
          note.appendChild(toggle);
          table.appendChild(note);
        }
      }

      // ------------------------------------------------ action bar

      function renderBar() {
        bar.textContent = '';
        const chosen = [...state.selected];
        const bytes = chosen.reduce((sum, slug) => sum + sizeOf(slug), 0);
        bar.appendChild(
          el(
            'span',
            'bar-summary',
            chosen.length === 0
              ? t().nothingSelected
              : format(t().selection, { count: chosen.length, size: formatBytes(bytes) })
          )
        );

        const permanent = el('label', 'check subtle');
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = state.permanent;
        box.addEventListener('change', () => (state.permanent = box.checked));
        permanent.append(box, el('span', null, t().permanent));
        bar.appendChild(permanent);

        bar.appendChild(ctx.commandButton(() => (chosen.length ? ctx.command('disk.clean', input()) : '')));
        const go = el('button', 'button danger', t().clean);
        go.type = 'button';
        go.disabled = chosen.length === 0;
        go.addEventListener('click', clean);
        bar.appendChild(go);
      }

      function input() {
        return { targets: [...state.selected], permanent: state.permanent };
      }

      function planBody(plan) {
        const list = el('div', 'plan-list');
        for (const item of plan.items) {
          const line = el('div', 'plan-row');
          const text = el('div', 'plan-text');
          text.appendChild(el('span', 'plan-name', nameOf(item.slug)));
          text.appendChild(el('span', 'plan-path', item.path));
          line.appendChild(text);
          line.appendChild(el('span', 'plan-size', formatBytes(item.bytes)));
          list.appendChild(line);
        }
        return list;
      }

      async function acknowledge(error) {
        if (error.code !== 'NEEDS_ACKNOWLEDGEMENT') return undefined;
        const list = el('div', 'plan-list');
        for (const item of (error.details && error.details.toolchains) || []) {
          const line = el('div', 'plan-row');
          const text = el('div', 'plan-text');
          text.appendChild(el('span', 'plan-name', nameOf(item.slug)));
          const found = state.targets.find((entry) => entry.value === item.slug);
          text.appendChild(el('span', 'plan-path', found && found.note ? found.note : item.consequence));
          line.appendChild(text);
          list.appendChild(line);
        }
        const ok = await ctx.sheet.open({
          title: t().toolchainTitle,
          message: t().toolchainMessage,
          body: list,
          accept: t().toolchainAccept,
          tone: 'danger',
          wide: true,
        });
        return ok ? { includeToolchains: true } : null;
      }

      async function clean() {
        const outcome = await ctx.run('disk.clean', input(), {
          recover: acknowledge,
          confirm: (plan) =>
            ctx.sheet.open({
              title: format(t().confirmTitle, { size: formatBytes(plan.bytes || 0) }),
              message: state.permanent ? t().confirmPermanent : s().trashNote,
              body: planBody(plan),
              accept: state.permanent ? t().deleteNow : s().moveToTrash,
              tone: 'danger',
              wide: true,
            }),
        });
        if (!outcome.ok) return;
        state.selected.clear();
        renderBar();
        loadRecent();
        measure(true);
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
          text.appendChild(el('span', 'row-title', [...new Set(entry.names)].map(nameOf).join(', ')));
          text.appendChild(
            el(
              'span',
              'row-note',
              `${ctx.relativeTime(entry.startedAt)} · ${format(t().recentRow, { count: entry.count, size: formatBytes(entry.bytes) })}`
            )
          );
          row.appendChild(text);
          const undo = el('button', 'button small', s().undo);
          undo.type = 'button';
          undo.addEventListener('click', async () => {
            undo.disabled = true;
            const outcome = await ctx.run('disk.restore', { run: entry.run });
            undo.disabled = false;
            if (outcome.ok) {
              loadRecent();
              measure(true);
            }
          });
          row.appendChild(undo);
          list.appendChild(row);
        }
        recent.appendChild(list);
      }

      renderSummary();
      renderBar();
      renderRecent();
      loadTargets().then(() => measure(false));
      loadRecent();
    },
  });
})();
