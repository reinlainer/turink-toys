'use strict';

// The window shell: the sidebar, switching screens, the activity panel and the
// one path every screen uses to run a task. A screen describes what a person
// sees for one area; how a run is started, confirmed and reported lives here
// so every screen behaves the same way.
//
// Every label comes from the main process, so this file carries no language.

(function () {
  const { el } = window.TurinkDom;
  const { icon, hydrate } = window.TurinkIcons;

  const ui = {
    nav: document.getElementById('nav'),
    screen: document.getElementById('screen'),
    language: document.getElementById('language-select'),
    activity: document.getElementById('activity'),
    activityToggle: document.getElementById('activity-toggle'),
    activityLabel: document.getElementById('activity-label'),
    activityDot: document.getElementById('activity-dot'),
    activityTitle: document.getElementById('activity-title'),
    activityBody: document.getElementById('activity-body'),
    activityRecent: document.getElementById('activity-recent'),
    activityClear: document.getElementById('activity-clear'),
    activityClose: document.getElementById('activity-close'),
    raw: document.getElementById('raw-toggle'),
    rawLabel: document.getElementById('raw-label'),
    toast: document.getElementById('toast'),
  };

  // A flag stands for a country rather than a language, and English has no
  // single one, so the name beside it carries the actual meaning.
  const LOCALES = {
    en: { flag: '🇺🇸', name: 'English' },
    ko: { flag: '🇰🇷', name: '한국어' },
  };

  let tasks = [];
  let strings = {};
  let availableLocales = [];
  let screens = [];
  let current = null;
  let busy = false;

  const s = () => strings;
  const taskById = (id) => tasks.find((task) => task.id === id) || null;
  const taskName = (id) => (taskById(id) ? taskById(id).title : id);
  const format = (template, params) =>
    String(template || '').replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m));

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
  }

  // ------------------------------------------------------------- activity

  const term = window.TurinkConsole.create({
    container: ui.activityBody,
    rawToggle: ui.raw,
    strings: () => ({ consoleEmpty: strings.activity.empty, resultTitle: strings.resultTitle }),
    taskName,
  });

  function setActivity(open) {
    ui.activity.hidden = !open;
    ui.activityToggle.setAttribute('aria-pressed', String(open));
    if (open) {
      ui.activityDot.hidden = true;
      term.render();
    }
  }

  function noteActivity() {
    if (ui.activity.hidden) ui.activityDot.hidden = false;
  }

  // ------------------------------------------------------------- toast

  let toastTimer = null;

  function toast(text, tone) {
    clearTimeout(toastTimer);
    ui.toast.className = `toast ${tone || 'busy'}`;
    ui.toast.querySelector('.toast-text').textContent = text;
    const slot = ui.toast.querySelector('.toast-icon');
    slot.textContent = '';
    if (tone === 'done') slot.appendChild(icon('check'));
    else if (tone === 'error') slot.appendChild(icon('alert'));
    else slot.appendChild(el('span', 'spinner'));
    ui.toast.hidden = false;
    if (tone === 'done' || tone === 'error') {
      toastTimer = setTimeout(() => {
        ui.toast.hidden = true;
      }, tone === 'error' ? 6000 : 2600);
    }
  }

  // ------------------------------------------------------------- sheet

  const sheet = window.TurinkSheet.create({
    root: document.getElementById('confirm-sheet'),
    body: document.querySelector('#confirm-sheet .sheet-body'),
    title: document.getElementById('confirm-title'),
    message: document.getElementById('confirm-message'),
    detail: document.getElementById('confirm-detail'),
    extra: document.getElementById('confirm-extra'),
    cancel: document.getElementById('confirm-cancel'),
    accept: document.getElementById('confirm-accept'),
    strings: () => strings,
  });

  // ------------------------------------------------------------- running

  function cleanInput(input) {
    const payload = { ...input };
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === '' || value === null) delete payload[key];
    }
    return payload;
  }

  // Runs a task the way every screen needs: shows progress, turns the two
  // gates into a dialog, and reports the end. A screen passes handlers for the
  // gates it can meet; one it leaves out ends the run with the core's message.
  //
  // Resolves to { ok, result, shown } on success, or { ok: false, error } when
  // the run stopped. A dismissed confirmation resolves to { ok: false, cancelled }.
  async function run(taskId, input, handlers = {}, confirmToken = null) {
    const label = handlers.label || taskName(taskId);
    busy = true;
    document.body.classList.add('busy');
    toast(format(strings.toast.running, { task: label }));

    let outcome;
    try {
      outcome = await window.turink.runTask(taskId, cleanInput(input), confirmToken);
    } finally {
      busy = false;
      document.body.classList.remove('busy');
    }

    if (outcome.ok) {
      if (!handlers.quiet) toast(format(strings.toast.done, { task: label }), 'done');
      else ui.toast.hidden = true;
      return outcome;
    }

    const error = outcome.error;
    ui.toast.hidden = true;

    if (error.code === 'NEEDS_CONFIRM' && outcome.plan) {
      const accepted = handlers.confirm
        ? await handlers.confirm(outcome.plan, error)
        : await sheet.open({
            title: outcome.plan.summary,
            message: [error.message, error.hint].filter(Boolean).join('\n'),
            detail: outcome.plan.items.slice(0, 60).map((item) => item.path).join('\n'),
            tone: 'danger',
          });
      if (!accepted) return { ok: false, cancelled: true };
      return run(taskId, input, handlers, outcome.plan.hash);
    }

    if (handlers.recover) {
      const next = await handlers.recover(error);
      if (next === null) return { ok: false, cancelled: true };
      if (next) return run(taskId, { ...input, ...next }, handlers, confirmToken);
    }

    toast([error.message, error.hint].filter(Boolean).join(' '), 'error');
    return { ok: false, error };
  }

  // Reads what a screen displays without a toast or a journal entry.
  function peek(taskId, input) {
    return window.turink.peekTask(taskId, cleanInput(input || {}));
  }

  async function runElevated(taskId, input, label) {
    const name = label || taskName(taskId);
    toast(format(strings.toast.running, { task: name }));
    const outcome = await window.turink.runElevated(taskId, cleanInput(input));
    if (outcome.ok) {
      toast(format(strings.toast.done, { task: name }), 'done');
      return outcome;
    }
    if (outcome.cancelled) {
      toast(strings.toast.cancelled, 'error');
      return outcome;
    }
    toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
    return outcome;
  }

  // ------------------------------------------------------------- shared pieces

  // The terminal form of an action, for handing the same work to a script or an
  // agent. Kept as a quiet secondary control rather than a headline.
  function commandButton(getCommand) {
    const button = el('button', 'icon-button command');
    button.type = 'button';
    button.title = strings.copyCommand;
    button.setAttribute('aria-label', strings.copyCommand);
    button.appendChild(icon('terminal'));
    button.addEventListener('click', () => {
      const command = getCommand();
      if (!command) return;
      navigator.clipboard.writeText(command);
      toast(`${strings.copied}: ${command}`, 'done');
    });
    return button;
  }

  function command(taskId, input) {
    const task = taskById(taskId);
    return task ? window.TurinkForm.toCommand(task, input) : '';
  }

  // A finished run's rows, notes and the files it produced.
  function resultCard(shown, options = {}) {
    const card = el('div', 'result-card' + (options.tone ? ` ${options.tone}` : ''));
    if (options.title) {
      const head = el('div', 'result-head');
      head.appendChild(icon(options.tone === 'warn' ? 'alert' : 'check'));
      head.appendChild(el('span', null, options.title));
      card.appendChild(head);
    }
    if (shown.rows && shown.rows.length > 0) {
      const table = el('dl', 'result-rows');
      for (const entry of shown.rows) {
        table.appendChild(el('dt', null, entry.label));
        table.appendChild(el('dd', entry.tone || null, entry.value));
      }
      card.appendChild(table);
    }
    for (const target of shown.paths || []) {
      const line = el('div', 'result-path');
      line.appendChild(el('span', 'path', target));
      const reveal = el('button', 'button small', strings.revealInFinder);
      reveal.type = 'button';
      reveal.addEventListener('click', () => window.turink.reveal(target));
      line.appendChild(reveal);
      card.appendChild(line);
    }
    for (const note of shown.notes || []) card.appendChild(el('p', 'result-note', note));
    return card;
  }

  function header(title, subtitle) {
    const head = el('header', 'screen-head');
    head.appendChild(el('h1', null, title));
    if (subtitle) head.appendChild(el('p', 'subtitle', subtitle));
    return head;
  }

  function relativeTime(iso) {
    const date = new Date(iso);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const ctx = {
    s,
    el,
    icon,
    format,
    formatBytes,
    relativeTime,
    taskById,
    taskName,
    sheet,
    toast,
    run,
    peek,
    runElevated,
    command,
    commandButton,
    resultCard,
    header,
    isBusy: () => busy,
  };

  // ------------------------------------------------------------- navigation

  function claimed() {
    return new Set(screens.flatMap((screen) => screen.tasks || []));
  }

  function buildScreens() {
    const owned = new Set();
    screens = window.TurinkScreens.filter((screen) => {
      // A screen whose tasks are absent from this build would have nothing to
      // run, so it is left out rather than shown broken.
      const present = (screen.tasks || []).every((id) => taskById(id));
      if (present) for (const id of screen.tasks || []) owned.add(id);
      return present && screen.id !== 'other';
    });
    const rest = tasks.filter((task) => !owned.has(task.id));
    if (rest.length > 0) {
      const other = window.TurinkScreens.find((screen) => screen.id === 'other');
      screens.push({ ...other, tasks: rest.map((task) => task.id) });
    }
  }

  function buildNav() {
    ui.nav.textContent = '';
    for (const screen of screens) {
      const button = el('button', 'nav-item');
      button.type = 'button';
      button.setAttribute('aria-current', String(current && current.id === screen.id));
      button.appendChild(icon(screen.icon, 'nav-icon'));
      button.appendChild(el('span', 'nav-label', strings.nav[screen.id] || screen.id));
      button.addEventListener('click', () => show(screen.id));
      ui.nav.appendChild(button);
    }
  }

  function show(id, prefill) {
    const next = screens.find((screen) => screen.id === id) || screens[0];
    if (current && current.unmount) current.unmount();
    current = next;
    window.turink.rememberTask(`screen:${next.id}`);
    ui.screen.textContent = '';
    ui.screen.scrollTop = 0;
    const root = el('div', `screen-body screen-${next.id}`);
    ui.screen.appendChild(root);
    next.mount(root, ctx, prefill || null);
    buildNav();
  }

  function screenForTask(taskId) {
    return screens.find((screen) => (screen.tasks || []).includes(taskId));
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
    ui.activityLabel.textContent = strings.activity.title;
    ui.activityTitle.textContent = strings.activity.title;
    ui.rawLabel.textContent = strings.activity.raw;
    ui.activityClear.textContent = strings.activity.clear;
    ui.activityRecent.textContent = strings.activity.recent;
    term.render();
  }

  async function changeLocale(next) {
    const payload = await window.turink.setLocale(next);
    strings = payload.ui;
    tasks = payload.tasks;
    buildLanguageSelect(payload.locale);
    buildScreens();
    applyStrings();
    show(current ? current.id : screens[0].id);
  }

  // ------------------------------------------------------------- start

  hydrate();

  window.turink.onEvent((record) => {
    term.push(record, false);
    noteActivity();
    // Long runs report progress; the toast carries the latest step so a person
    // can see the run moving without opening the activity panel.
    if (busy && record.event === 'progress' && record.total) {
      ui.toast.querySelector('.toast-text').textContent =
        `${ui.toast.querySelector('.toast-text').textContent.split(' · ')[0]} · ${record.done}/${record.total}`;
    }
  });
  window.turink.onExternal((record) => {
    term.push(record, true);
    noteActivity();
    if (current && current.onExternal) current.onExternal(record);
  });
  window.turink.onPrefill(({ task, input }) => {
    const screen = screenForTask(task);
    if (screen) show(screen.id, { task, input });
  });
  window.turink.onFocusRun(async (runId) => {
    setActivity(true);
    const events = await window.turink.readRun(runId);
    if (events) for (const record of events) term.push(record, true);
  });

  ui.activityToggle.addEventListener('click', () => setActivity(ui.activity.hidden));
  ui.activityClose.addEventListener('click', () => setActivity(false));
  ui.raw.addEventListener('change', () => term.render());
  ui.activityClear.addEventListener('click', () => term.clear());
  ui.language.addEventListener('change', () => changeLocale(ui.language.value));
  ui.activityRecent.addEventListener('click', async () => {
    const runs = await window.turink.listRuns();
    term.clear();
    if (runs.length === 0) {
      term.push({ ts: new Date().toISOString(), event: 'log', msg: strings.activity.none });
      return;
    }
    for (const entry of runs.slice().reverse()) {
      term.push(
        {
          ts: entry.startedAt,
          event: 'log',
          msg: `${taskName(entry.task)}  ·  ${strings.activity.status[entry.status] || entry.status}  ·  ${entry.run}`,
        },
        entry.source !== 'app'
      );
    }
  });

  (async function start() {
    const payload = await window.turink.strings();
    strings = payload.ui;
    availableLocales = payload.available;
    buildLanguageSelect(payload.locale);
    tasks = await window.turink.listTasks();
    buildScreens();
    applyStrings();

    const remembered = String(payload.lastTask || '');
    const id = remembered.startsWith('screen:') ? remembered.slice(7) : null;
    show(id && screens.some((screen) => screen.id === id) ? id : screens[0].id);
  })();

  window.TurinkApp = { ctx, claimed };
})();
