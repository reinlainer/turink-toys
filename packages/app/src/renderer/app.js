'use strict';

// Coordinates the window: picks a task, builds its form, runs it, shows what
// came back. The console and the modal live in modules of their own, so what
// remains here is the flow between them.
//
// Every label comes from the main process, so this file carries no language and
// gaining a locale costs nothing in it.

(function () {
  const { el } = window.TurinkDom;

  const ui = {
    taskList: document.getElementById('task-list'),
    title: document.getElementById('task-title'),
    when: document.getElementById('task-when'),
    tags: document.getElementById('task-tags'),
    form: document.getElementById('task-form'),
    result: document.getElementById('result-card'),
    run: document.getElementById('run-button'),
    preview: document.getElementById('command-preview'),
    copy: document.getElementById('copy-command'),
    consoleBody: document.getElementById('console-body'),
    consoleTitle: document.getElementById('console-title'),
    rawLabel: document.getElementById('raw-label'),
    raw: document.getElementById('raw-toggle'),
    clear: document.getElementById('clear-console'),
    showRuns: document.getElementById('show-runs'),
    language: document.getElementById('language-select'),
    sheet: document.getElementById('confirm-sheet'),
    sheetBody: document.querySelector('#confirm-sheet .sheet-body'),
    sheetTitle: document.getElementById('confirm-title'),
    sheetMessage: document.getElementById('confirm-message'),
    sheetExtra: document.getElementById('confirm-extra'),
    sheetDetail: document.getElementById('confirm-detail'),
    sheetCancel: document.getElementById('confirm-cancel'),
    sheetAccept: document.getElementById('confirm-accept'),
  };

  // A flag stands for a country rather than a language, and English has no
  // single one, so the name beside it carries the actual meaning. Names are
  // written in their own language, which is what a reader looking for theirs
  // scans for.
  const LOCALES = {
    en: { flag: '🇺🇸', name: 'English' },
    ko: { flag: '🇰🇷', name: '한국어' },
  };

  let tasks = [];
  let strings = {};
  let availableLocales = [];
  let current = null;
  let state = {};
  let busy = false;

  const readStrings = () => strings;
  const taskName = (id) => {
    const task = tasks.find((entry) => entry.id === id);
    return task ? task.title : id;
  };

  const term = window.TurinkConsole.create({
    container: ui.consoleBody,
    rawToggle: ui.raw,
    strings: readStrings,
    taskName,
  });

  const sheet = window.TurinkSheet.create({
    root: ui.sheet,
    body: ui.sheetBody,
    title: ui.sheetTitle,
    message: ui.sheetMessage,
    detail: ui.sheetDetail,
    extra: ui.sheetExtra,
    cancel: ui.sheetCancel,
    accept: ui.sheetAccept,
    strings: readStrings,
  });

  // Handed to the form generator so a picker field can open the modal without
  // knowing anything about it.
  const formContext = {
    strings: {},
    lastOptions: [],
    async pickOptions(rule, chosen, multiple) {
      const { values, options } = await sheet.pickOptions(rule, chosen, multiple);
      formContext.lastOptions = options;
      return values;
    },
  };

  // ------------------------------------------------------------- result

  // A line scrolling past in the console is easy to miss, so a finished run
  // also leaves a card naming what it produced and a way to open it.
  function showResult(shown) {
    ui.result.textContent = '';
    const empty =
      !shown || (shown.rows.length === 0 && shown.paths.length === 0 && shown.notes.length === 0);
    if (empty) {
      ui.result.hidden = true;
      return;
    }

    const card = el('div', 'result');
    card.appendChild(el('div', 'result-title', strings.resultTitle));

    if (shown.rows.length > 0) {
      const table = el('div', 'result-rows');
      for (const entry of shown.rows) {
        table.appendChild(el('span', 'result-key', entry.label));
        table.appendChild(
          el('span', 'result-value' + (entry.tone ? ` ${entry.tone}` : ''), entry.value)
        );
      }
      card.appendChild(table);
    }

    for (const target of shown.paths) {
      const line = el('div', 'result-line');
      line.appendChild(el('span', 'result-path', target));
      const reveal = el('button', 'ghost-button small', strings.revealInFinder);
      reveal.type = 'button';
      reveal.addEventListener('click', () => window.turink.reveal(target));
      line.appendChild(reveal);
      card.appendChild(line);
    }

    for (const note of shown.notes) card.appendChild(el('div', 'result-note', note));

    ui.result.appendChild(card);
    ui.result.hidden = false;
  }

  // ------------------------------------------------------------- sidebar

  function buildSidebar() {
    ui.taskList.textContent = '';
    let group = null;

    for (const task of tasks) {
      if (task.domain !== group) {
        group = task.domain;
        ui.taskList.appendChild(el('div', 'group-label', strings.domain[group] || group));
      }

      const button = el('button', 'task-item');
      button.type = 'button';
      button.setAttribute('aria-selected', String(current && current.id === task.id));
      button.title = task.summary;

      button.appendChild(el('span', 'item-name', task.title));
      if (task.risk === 'destroy' || task.risk === 'mutate') {
        button.appendChild(el('span', `risk-dot risk-${task.risk}`));
      }

      button.addEventListener('click', () => {
        select(task.id);
        window.turink.rememberTask(task.id);
      });
      ui.taskList.appendChild(button);
    }
  }

  function select(taskId, prefill) {
    current = tasks.find((task) => task.id === taskId) || null;
    if (!current) return;

    state = window.TurinkForm.initialState(current);
    if (prefill) Object.assign(state, prefill);

    ui.title.textContent = current.title;
    ui.when.textContent = current.whenToUse;

    ui.tags.textContent = '';
    ui.tags.appendChild(
      el('span', 'tag' + (current.risk === 'destroy' ? ' destroy' : ''), strings.risk[current.risk])
    );
    ui.tags.appendChild(el('span', 'tag', strings.cost[current.cost]));

    formContext.strings = strings;
    ui.form.textContent = '';
    ui.form.appendChild(window.TurinkForm.build(current, state, refreshAction, formContext));
    ui.result.hidden = true;
    buildSidebar();
    refreshAction();
  }

  function refreshAction() {
    if (!current) return;
    ui.run.disabled = !window.TurinkForm.isRunnable(current, state) || busy;
    ui.run.textContent = busy
      ? strings.running
      : current.risk === 'destroy'
        ? strings.runDestructive
        : strings.run;

    const command = window.TurinkForm.toCommand(current, state);
    ui.preview.textContent = command;
    ui.copy.textContent = strings.copyCommand;
    ui.copy.hidden = false;
    ui.copy.onclick = () => {
      navigator.clipboard.writeText(command);
      ui.copy.textContent = strings.copied;
      setTimeout(() => {
        ui.copy.textContent = strings.copyCommand;
      }, 1400);
    };
  }

  // ------------------------------------------------------------- running

  async function runCurrent(confirmToken) {
    busy = true;
    ui.result.hidden = true;
    refreshAction();

    // The core rejects an empty optional string, so blanks are dropped rather
    // than sent through as arguments nobody filled in.
    const payload = { ...state };
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === '') delete payload[key];
    }

    const outcome = await window.turink.runTask(current.id, payload, confirmToken);
    busy = false;

    if (outcome.ok) {
      showResult(outcome.shown);
      refreshAction();
      return;
    }

    const error = outcome.error;

    // Both gates that stop a run return what a person needs in order to decide.
    // Presenting them as a sheet turns two command line calls into one click
    // without skipping the check itself.
    if (error.code === 'NEEDS_CONFIRM' && outcome.plan) {
      const accepted = await sheet.open({
        title: outcome.plan.summary,
        message: [error.message, error.hint].filter(Boolean).join('\n'),
        detail: outcome.plan.items
          .slice(0, 40)
          .map((item) => item.path)
          .join('\n'),
      });
      if (accepted) return runCurrent(outcome.plan.hash);
      refreshAction();
      return;
    }

    if (error.code === 'NEEDS_ACKNOWLEDGEMENT') {
      const accepted = await sheet.open({
        title: error.message,
        message: error.hint || '',
        detail: (error.details?.toolchains || [])
          .map((item) => `${item.slug}\n  ${item.consequence}`)
          .join('\n\n'),
      });
      if (accepted) {
        state.includeToolchains = true;
        return runCurrent(confirmToken);
      }
      refreshAction();
      return;
    }

    term.push({ ts: new Date().toISOString(), event: 'warn', code: error.code, path: error.message });
    if (error.hint) term.push({ ts: new Date().toISOString(), event: 'log', msg: error.hint });
    refreshAction();
  }

  // ------------------------------------------------------------- chrome

  function buildLanguageSelect(active) {
    ui.language.textContent = '';
    for (const code of availableLocales) {
      const meta = LOCALES[code] || { flag: '', name: code };
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${meta.flag}  ${meta.name}`.trim();
      ui.language.appendChild(option);
    }
    ui.language.value = active;
  }

  function applyStrings() {
    ui.consoleTitle.textContent = strings.console;
    ui.rawLabel.textContent = strings.rawEvents;
    ui.clear.textContent = strings.clear;
    ui.showRuns.textContent = strings.recentRuns;
    term.render();
    if (current) select(current.id, state);
    else ui.title.textContent = strings.selectTask;
  }

  async function changeLocale(next) {
    const payload = await window.turink.setLocale(next);
    strings = payload.ui;
    tasks = payload.tasks;
    buildLanguageSelect(payload.locale);
    buildSidebar();
    applyStrings();
  }

  // ------------------------------------------------------------- start

  window.turink.onEvent((record) => term.push(record, false));
  window.turink.onExternal((record) => term.push(record, true));
  window.turink.onPrefill(({ task, input }) => select(task, input));
  window.turink.onFocusRun(async (runId) => {
    const events = await window.turink.readRun(runId);
    if (events) for (const record of events) term.push(record, true);
  });

  ui.raw.addEventListener('change', () => term.render());
  ui.clear.addEventListener('click', () => term.clear());
  ui.run.addEventListener('click', () => runCurrent(null));
  ui.language.addEventListener('change', () => changeLocale(ui.language.value));

  // Running is the one action worth a shortcut, since it is what a session
  // repeats while adjusting inputs.
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !ui.run.disabled) {
      runCurrent(null);
    }
  });

  ui.showRuns.addEventListener('click', async () => {
    const runs = await window.turink.listRuns();
    term.clear();
    if (runs.length === 0) {
      term.push({ ts: new Date().toISOString(), event: 'log', msg: strings.noRuns });
      return;
    }
    for (const run of runs) {
      term.push(
        {
          ts: run.startedAt,
          event: 'log',
          msg: `${taskName(run.task)}  ${run.status}  ${run.run}`,
        },
        run.source !== 'app'
      );
    }
  });

  (async function start() {
    const payload = await window.turink.strings();
    strings = payload.ui;
    availableLocales = payload.available;
    buildLanguageSelect(payload.locale);

    tasks = await window.turink.listTasks();
    const remembered = payload.lastTask && tasks.some((task) => task.id === payload.lastTask);
    select(remembered ? payload.lastTask : tasks[0].id);
    applyStrings();
  })();
})();
