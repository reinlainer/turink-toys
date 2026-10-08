'use strict';

// One place for zip files. What can be done follows from what was dropped:
// zip files can be extracted or checked, anything else is compressed. Checking
// runs both the content inspection and the Windows compatibility check, since a
// person asking "is this archive fine" wants both answers at once.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  const isZip = (target) => /\.zip$/i.test(target);
  const baseName = (target) => target.split('/').filter(Boolean).pop() || target;

  function checkbox(el, label, checked, onChange) {
    const line = el('label', 'check');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = checked;
    box.addEventListener('change', () => onChange(box.checked));
    line.append(box, el('span', null, label));
    return line;
  }

  screens.push({
    id: 'archive',
    icon: 'archive',
    tasks: ['archive.compress', 'archive.extract', 'archive.inspect', 'archive.verify'],

    mount(root, ctx, prefill) {
      const { el, icon, s, format } = ctx;
      const t = () => s().archive;

      const state = {
        targets: prefill && prefill.input && prefill.input.targets ? [...prefill.input.targets] : [],
        mode: null,
        compress: { separate: false, force: false, symlinks: 'store', excludeWindowsMetadata: false },
        extract: { force: false },
      };

      root.appendChild(ctx.header(s().nav.archive, t().subtitle));

      const drop = el('section', 'dropzone');
      const selection = el('section', 'card selection');
      const action = el('section', 'card action-card');
      const results = el('section', 'results');
      root.append(drop, selection, action, results);

      function addTargets(paths) {
        for (const target of paths) if (!state.targets.includes(target)) state.targets.push(target);
        state.mode = null;
        render();
      }

      // ------------------------------------------------ drop area

      function renderDrop() {
        drop.textContent = '';
        drop.classList.toggle('compact', state.targets.length > 0);
        drop.appendChild(icon('drop', 'drop-icon', 26));
        const text = el('div', 'drop-text');
        text.appendChild(el('strong', null, t().dropTitle));
        text.appendChild(el('span', null, t().dropBody));
        drop.appendChild(text);
        const choose = el('button', 'button', s().choose);
        choose.type = 'button';
        choose.addEventListener('click', async () => addTargets(await window.turink.pickPaths(false)));
        drop.appendChild(choose);
      }

      drop.addEventListener('dragover', (event) => {
        event.preventDefault();
        drop.classList.add('over');
      });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (event) => {
        event.preventDefault();
        drop.classList.remove('over');
        const paths = [...event.dataTransfer.files].map((file) => window.turink.pathForFile(file)).filter(Boolean);
        if (paths.length > 0) addTargets(paths);
      });

      // ------------------------------------------------ selection

      function zipsOnly() {
        return state.targets.length > 0 && state.targets.every(isZip);
      }

      function renderSelection() {
        selection.textContent = '';
        selection.hidden = state.targets.length === 0;
        if (selection.hidden) return;

        const head = el('div', 'card-head');
        head.appendChild(
          el('h2', null, format(zipsOnly() ? t().zipsSelected : t().itemsSelected, { count: state.targets.length }))
        );
        const clear = el('button', 'text-button', t().clearAll);
        clear.type = 'button';
        clear.addEventListener('click', () => {
          state.targets = [];
          render();
        });
        head.appendChild(clear);
        selection.appendChild(head);

        const list = el('ul', 'file-list');
        for (const target of state.targets) {
          const item = el('li');
          item.appendChild(icon(isZip(target) ? 'zip' : /\.[^/]+$/.test(baseName(target)) ? 'file' : 'folder', 'file-icon'));
          const text = el('div', 'file-text');
          text.appendChild(el('span', 'file-name', baseName(target)));
          text.appendChild(el('span', 'file-path', target.slice(0, target.length - baseName(target).length)));
          item.appendChild(text);
          const remove = el('button', 'icon-button');
          remove.type = 'button';
          remove.title = t().remove;
          remove.setAttribute('aria-label', t().remove);
          remove.appendChild(icon('close', null, 14));
          remove.addEventListener('click', () => {
            state.targets = state.targets.filter((entry) => entry !== target);
            render();
          });
          item.appendChild(remove);
          list.appendChild(item);
        }
        selection.appendChild(list);
      }

      // ------------------------------------------------ action

      function modes() {
        return zipsOnly() ? ['extract', 'inspect'] : ['compress'];
      }

      function renderAction() {
        action.textContent = '';
        action.hidden = state.targets.length === 0;
        if (action.hidden) return;

        const available = modes();
        if (!available.includes(state.mode)) state.mode = available[0];

        if (available.length > 1) {
          const tabs = el('div', 'segmented');
          for (const mode of available) {
            const tab = el('button', 'segment', t()[mode]);
            tab.type = 'button';
            tab.setAttribute('aria-pressed', String(state.mode === mode));
            tab.addEventListener('click', () => {
              state.mode = mode;
              renderAction();
            });
            tabs.appendChild(tab);
          }
          action.appendChild(tabs);
        }

        action.appendChild(el('p', 'action-hint', t()[`${state.mode}Hint`]));

        const options = el('div', 'options');
        if (state.mode === 'compress') {
          const c = state.compress;
          if (state.targets.length > 1) {
            options.appendChild(checkbox(el, t().separate, c.separate, (v) => (c.separate = v)));
          }
          options.appendChild(checkbox(el, t().overwriteArchive, c.force, (v) => (c.force = v)));
          options.appendChild(checkbox(el, t().excludeWindows, c.excludeWindowsMetadata, (v) => (c.excludeWindowsMetadata = v)));

          const line = el('label', 'select-line');
          line.appendChild(el('span', null, t().symlinks));
          const select = document.createElement('select');
          for (const [value, label] of [
            ['store', t().symlinkStore],
            ['follow', t().symlinkFollow],
            ['skip', t().symlinkSkip],
          ]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
          }
          select.value = c.symlinks;
          select.addEventListener('change', () => (c.symlinks = select.value));
          line.appendChild(select);
          options.appendChild(line);
        } else if (state.mode === 'extract') {
          options.appendChild(checkbox(el, t().overwriteFolder, state.extract.force, (v) => (state.extract.force = v)));
        }
        if (options.childNodes.length > 0) action.appendChild(options);

        const bar = el('div', 'action-bar');
        const go = el('button', 'button primary large', t()[state.mode]);
        go.type = 'button';
        go.addEventListener('click', () => perform(go));
        bar.appendChild(go);
        bar.appendChild(ctx.commandButton(commandFor));
        action.appendChild(bar);
      }

      function commandFor() {
        if (state.mode === 'compress') return ctx.command('archive.compress', { targets: state.targets, ...state.compress });
        const task = state.mode === 'extract' ? 'archive.extract' : 'archive.verify';
        return state.targets
          .map((target) => ctx.command(task, { archive: target, ...(state.mode === 'extract' ? state.extract : {}) }))
          .join(' && ');
      }

      // ------------------------------------------------ running

      function showResult(card) {
        results.insertBefore(card, results.firstChild);
      }

      async function chooseEncoding(error) {
        const candidates = (error.details && error.details.candidates) || [];
        if (error.code !== 'ENCODING_AMBIGUOUS' || candidates.length === 0) return undefined;
        let chosen = candidates[0].encoding;
        const list = el('div', 'choice-list');
        candidates.forEach((candidate, index) => {
          const line = el('label', 'choice');
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'encoding';
          radio.checked = index === 0;
          radio.addEventListener('change', () => (chosen = candidate.encoding));
          const text = el('span', 'choice-text');
          text.appendChild(el('strong', null, candidate.label));
          text.appendChild(el('span', 'sample', (candidate.sample || []).join('  ·  ')));
          line.append(radio, text);
          list.appendChild(line);
        });
        const ok = await ctx.sheet.open({
          title: t().encodingTitle,
          message: t().encodingMessage,
          body: list,
          accept: t().encodingAccept,
          wide: true,
        });
        return ok ? { encoding: chosen } : null;
      }

      async function perform(button) {
        button.disabled = true;
        try {
          if (state.mode === 'compress') {
            const outcome = await ctx.run('archive.compress', { targets: state.targets, ...state.compress });
            if (outcome.ok) showResult(ctx.resultCard(outcome.shown, { title: s().resultTitle }));
            return;
          }

          for (const target of state.targets) {
            if (state.mode === 'extract') {
              const outcome = await ctx.run(
                'archive.extract',
                { archive: target, ...state.extract },
                { recover: chooseEncoding, label: `${t().extract} · ${baseName(target)}` }
              );
              if (outcome.ok) showResult(ctx.resultCard(outcome.shown, { title: baseName(target) }));
            } else {
              await inspectOne(target);
            }
          }
        } finally {
          button.disabled = false;
        }
      }

      async function inspectOne(target) {
        const label = `${t().inspect} · ${baseName(target)}`;
        const verified = await ctx.run('archive.verify', { archive: target }, { label, quiet: true });
        if (!verified.ok) return;
        const inspected = await ctx.run('archive.inspect', { archive: target }, { label });
        const v = verified.result;
        const info = inspected.ok ? inspected.result : null;

        const rows = [{ label: t().items, value: String(v.entries) }];
        if (v.nonAsciiNames > 0) rows.push({ label: t().nonAscii, value: String(v.nonAsciiNames) });
        if (info && info.assumedEncoding) rows.push({ label: t().encoding, value: info.assumedEncoding.toUpperCase() });

        const notes = v.problems.map((problem) =>
          format(t().problem[problem.code] || problem.detail, { count: problem.entries })
        );
        if (!v.ready) notes.push(t().fixHint);

        showResult(
          ctx.resultCard(
            { rows, notes },
            { title: `${baseName(target)} — ${v.ready ? t().verdictOk : t().verdictBad}`, tone: v.ready ? null : 'warn' }
          )
        );
      }

      function render() {
        renderDrop();
        renderSelection();
        renderAction();
      }

      render();
    },
  });
})();
