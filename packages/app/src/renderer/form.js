'use strict';

// Input controls are generated from the task manifest rather than written per
// task. Declaring a new argument in the core is therefore enough to make it
// appear here, which is what keeps the window and the command line describing
// the same thing.

(function () {
  const { el } = window.TurinkDom;

  function pathField(name, rule, state, onChange, strings) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, rule.label));
    wrap.appendChild(el('p', 'hint', rule.description));

    const zone = el('div', 'dropzone');
    const empty = strings.dropHint;

    function render() {
      zone.textContent = '';
      const values = state[name] || [];
      if (values.length === 0) {
        zone.textContent = empty;
        return;
      }
      const list = el('ul');
      for (const value of values) list.appendChild(el('li', null, value));
      zone.appendChild(list);
    }

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('over');
      const dropped = [...event.dataTransfer.files].map((file) => window.turink.pathForFile(file)).filter(Boolean);
      if (dropped.length === 0) return;
      state[name] = rule.type === 'array' ? dropped : [dropped[0]];
      render();
      onChange();
    });

    const row = el('div', 'path-field');
    const choose = el('button', 'button', strings.choose);
    choose.type = 'button';
    choose.addEventListener('click', async () => {
      const picked = await window.turink.pickPaths(false);
      if (picked.length === 0) return;
      state[name] = rule.type === 'array' ? picked : [picked[0]];
      render();
      onChange();
    });
    const clear = el('button', 'button', strings.clear);
    clear.type = 'button';
    clear.addEventListener('click', () => {
      state[name] = [];
      render();
      onChange();
    });

    row.append(choose, clear);
    wrap.append(zone, row);
    render();
    return wrap;
  }

  // Rendered when the schema names where a field's values come from. The list
  // itself opens in a sheet rather than sitting in the form, because a dozen
  // rows of checkboxes push everything else off the screen and read as clutter
  // next to three plain inputs.
  function optionsField(name, rule, state, onChange, ctx) {
    const { strings } = ctx;
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, rule.label));
    wrap.appendChild(el('p', 'hint', rule.description));

    const multiple = rule.type === 'array';
    const button = el('button', 'picker');
    button.type = 'button';

    const summary = el('span', 'picker-summary');
    const chevron = el('span', 'picker-chevron', '\u2304');
    button.append(summary, chevron);

    function current() {
      const value = state[name];
      if (multiple) return Array.isArray(value) ? value : [];
      return value === undefined || value === null ? [] : [value];
    }

    function render(options) {
      const chosen = current();
      if (chosen.length === 0) {
        summary.textContent = strings.pickNone;
        summary.classList.add('empty');
        return;
      }
      summary.classList.remove('empty');
      const labels = chosen.map((value) => {
        const found = (options || []).find((o) => o.value === value);
        return found ? found.label : value;
      });
      summary.textContent =
        labels.length <= 2
          ? labels.join(', ')
          : `${labels.slice(0, 2).join(', ')} ${strings.itemsMore.replace('{count}', labels.length - 2)}`;
    }

    // The option list is fetched once for the summary and refreshed from what
    // the sheet loaded, so opening the picker does not fetch it a second time.
    let known = [];

    button.addEventListener('click', async () => {
      const picked = await ctx.pickOptions(rule, current(), multiple);
      if (picked === null) return;
      known = ctx.lastOptions;
      state[name] = multiple ? picked : picked[0];
      render(known);
      onChange();
    });

    render(known);
    window.turink.loadOptions(rule.optionsFrom).then((options) => {
      known = options;
      render(options);
    });

    wrap.appendChild(button);
    return wrap;
  }

  function booleanField(name, rule, state, onChange) {
    const wrap = el('div', 'field checkbox');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `field-${name}`;
    box.checked = state[name] === true;
    box.addEventListener('change', () => {
      state[name] = box.checked;
      onChange();
    });
    const label = el('label', null, rule.description);
    label.htmlFor = box.id;
    wrap.append(box, label);
    return wrap;
  }

  function enumField(name, rule, state, onChange) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, rule.label));
    wrap.appendChild(el('p', 'hint', rule.description));
    const select = document.createElement('select');
    for (const option of rule.enum) {
      const node = document.createElement('option');
      node.value = option;
      node.textContent = option;
      select.appendChild(node);
    }
    select.value = state[name] ?? rule.default ?? rule.enum[0];
    select.addEventListener('change', () => {
      state[name] = select.value;
      onChange();
    });
    wrap.appendChild(select);
    return wrap;
  }

  function textField(name, rule, state, onChange) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, rule.label));
    wrap.appendChild(el('p', 'hint', rule.description));
    const input = document.createElement('input');
    input.type = rule.type === 'integer' || rule.type === 'number' ? 'number' : 'text';
    if (rule.minimum !== undefined) input.min = String(rule.minimum);
    if (rule.maximum !== undefined) input.max = String(rule.maximum);
    if (state[name] !== undefined) input.value = state[name];
    else if (rule.default !== undefined) input.value = rule.default;
    input.addEventListener('input', () => {
      state[name] = input.value === '' ? undefined : input.value;
      onChange();
    });
    wrap.appendChild(input);
    return wrap;
  }

  // A path-shaped argument gets a drop target; everything else falls back to a
  // control matching its declared type.
  function isPathLike(task, name, rule) {
    if (rule.positional && task.accepts !== null) return true;
    if (rule.type === 'array' && rule.positional) return true;
    return /^(targets|archive|output)$/.test(name) && rule.type !== 'boolean';
  }

  function build(task, state, onChange, ctx) {
    const strings = ctx.strings;
    const fragment = document.createDocumentFragment();
    const props = task.input.properties || {};

    for (const [name, rule] of Object.entries(props)) {
      let node;
      if (rule.type === 'boolean') node = booleanField(name, rule, state, onChange);
      else if (rule.optionsFrom) node = optionsField(name, rule, state, onChange, ctx);
      else if (rule.enum) node = enumField(name, rule, state, onChange);
      else if (isPathLike(task, name, rule) && rule.positional) {
        node = pathField(name, rule, state, onChange, strings);
      } else node = textField(name, rule, state, onChange);
      fragment.appendChild(node);
    }
    return fragment;
  }

  function initialState(task) {
    const state = {};
    for (const [name, rule] of Object.entries(task.input.properties || {})) {
      if (rule.type === 'array') state[name] = [];
      else if (rule.default !== undefined) state[name] = rule.default;
    }
    return state;
  }

  // The command shown under the Run button is what the same work looks like
  // from a terminal, so it can be copied into a script or handed to an agent.
  function toCommand(task, state) {
    const parts = ['turink-toys', task.id];
    const props = task.input.properties || {};

    for (const [name, rule] of Object.entries(props)) {
      const value = state[name];
      if (value === undefined || value === '' ) continue;
      if (rule.type === 'array' && rule.positional) {
        for (const item of value) parts.push(quote(item));
        continue;
      }
      if (rule.type === 'boolean') {
        if (value === true && value !== rule.default) parts.push(`--${dash(name)}`);
        continue;
      }
      if (rule.positional) {
        parts.push(quote(String(value)));
        continue;
      }
      if (String(value) === String(rule.default)) continue;
      parts.push(`--${dash(name)}`, quote(String(value)));
    }
    return parts.join(' ');
  }

  function dash(name) {
    return name.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
  }

  function quote(value) {
    return /[\s"'$`\\]/.test(value) ? `'${value.replace(/'/g, `'\\''`)}'` : value;
  }

  function isRunnable(task, state) {
    for (const name of task.input.required || []) {
      const value = state[name];
      if (value === undefined || value === null) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (value === '') return false;
    }
    return true;
  }

  window.TurinkForm = { build, initialState, toCommand, isRunnable };
})();
