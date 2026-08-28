'use strict';

// The modal every gate and picker shares. The caller supplies what goes in the
// middle; this owns showing, dismissing and returning an answer, so those are
// not reimplemented per prompt.

(function () {
  const { el } = window.TurinkDom;

  function create({ root, body, title, message, detail, extra, cancel, accept, strings }) {
    function open(options) {
      return new Promise((resolve) => {
        title.textContent = options.title || '';
        message.textContent = options.message || '';
        detail.textContent = '';
        detail.hidden = true;
        extra.textContent = '';
        body.classList.toggle('wide', options.wide === true);

        if (options.detail) {
          detail.textContent = options.detail;
          detail.hidden = false;
        }
        if (options.body) extra.appendChild(options.body);

        cancel.textContent = strings().cancel;
        accept.textContent = options.accept || strings().proceed;
        root.hidden = false;
        accept.focus();

        const close = (answer) => {
          root.hidden = true;
          extra.textContent = '';
          accept.onclick = null;
          cancel.onclick = null;
          document.removeEventListener('keydown', onKey);
          resolve(answer);
        };
        const onKey = (event) => {
          if (event.key === 'Escape') close(false);
        };
        document.addEventListener('keydown', onKey);
        accept.onclick = () => close(true);
        cancel.onclick = () => close(false);
      });
    }

    // Builds the list a picker field opens, and returns the chosen values or
    // null when dismissed.
    async function pickOptions(rule, chosen, multiple) {
      const s = strings();
      const options = await window.turink.loadOptions(rule.optionsFrom);
      const selection = new Set(chosen);
      const container = el('div');

      if (options.length === 0) {
        container.appendChild(el('p', 'options-empty', s.noOptions));
        const ok = await open({ title: rule.label, body: container, wide: true });
        return { values: ok ? [] : null, options };
      }

      if (multiple) {
        const bar = el('div', 'options-bar');
        const all = el('button', 'ghost-button small', s.selectAll);
        all.type = 'button';
        const none = el('button', 'ghost-button small', s.selectNone);
        none.type = 'button';
        bar.append(all, none);
        container.appendChild(bar);
        all.addEventListener('click', () => {
          for (const option of options) selection.add(option.value);
          syncRows();
        });
        none.addEventListener('click', () => {
          selection.clear();
          syncRows();
        });
      }

      const list = el('div', 'sheet-options');
      container.appendChild(list);

      // Rows are built once. Toggling a choice updates the affected rows in
      // place rather than rebuilding the list, which would throw away the
      // scroll position and the keyboard focus mid-selection.
      const rows = [];

      function syncRows() {
        for (const entry of rows) {
          const chosen = selection.has(entry.value);
          entry.input.checked = chosen;
          entry.line.classList.toggle('chosen', chosen);
        }
      }

      function paint() {
        list.textContent = '';
        rows.length = 0;
        let group = null;
        for (const option of options) {
          if (option.group && option.group !== group) {
            group = option.group;
            list.appendChild(el('div', 'options-group', group));
          }

          const line = el('label', 'option' + (selection.has(option.value) ? ' chosen' : ''));
          const input = document.createElement('input');
          input.type = multiple ? 'checkbox' : 'radio';
          input.name = 'sheet-option';
          input.checked = selection.has(option.value);
          input.addEventListener('change', () => {
            if (!multiple) selection.clear();
            if (input.checked) selection.add(option.value);
            else selection.delete(option.value);
            syncRows();
          });
          rows.push({ value: option.value, input, line });

          const text = el('span', 'option-text');
          const head = el('span', 'option-head');
          head.appendChild(el('span', 'option-label', option.label));
          if (option.badge) {
            head.appendChild(
              option.badge === 'cache'
                ? el('span', 'option-badge', s.kindCache)
                : el('span', 'option-badge warn', s.kindToolchain)
            );
          }
          text.appendChild(head);
          if (option.note) text.appendChild(el('span', 'option-note', option.note));

          line.append(input, text);
          list.appendChild(line);
        }
      }
      paint();

      const ok = await open({ title: rule.label, body: container, wide: true });
      return { values: ok ? [...selection] : null, options };
    }

    return { open, pickOptions };
  }

  window.TurinkSheet = { create };
})();
