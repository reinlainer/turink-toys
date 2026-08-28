'use strict';

// Renders the event stream. Kept apart from the form and the sheet because it
// has one job and no shared state with either: it takes events in and paints
// lines, whoever produced them.

(function () {
  const { el } = window.TurinkDom;

  function create({ container, rawToggle, strings, taskName }) {
    const records = [];

    function stamp(iso) {
      return iso ? new Date(iso).toLocaleTimeString([], { hour12: false }) : '';
    }

    function describe(record) {
      switch (record.event) {
        case 'run.start':
          return { text: taskName(record.task), cls: 'start' };
        case 'plan':
          return { text: record.summary, cls: '' };
        case 'progress':
          return {
            text: `${record.done}/${record.total}  ${record.label || ''}`,
            cls: '',
            ratio: record.total ? record.done / record.total : null,
          };
        case 'warn':
          return { text: `${record.code}  ${record.path || record.entries || ''}`, cls: 'warn' };
        case 'log':
          return { text: record.msg, cls: '' };
        case 'run.end':
          return {
            text:
              record.status === 'ok'
                ? strings().resultTitle
                : `${record.status}  ${record.error ? record.error.code : ''}`,
            cls: record.status === 'ok' ? 'done' : 'warn',
          };
        default:
          return { text: record.event, cls: '' };
      }
    }

    function render() {
      container.textContent = '';
      if (records.length === 0) {
        container.appendChild(el('p', 'console-empty', strings().consoleEmpty));
        return;
      }

      for (const { record, external } of records) {
        const line = el('div', 'line' + (external ? ' external' : ''));
        line.appendChild(el('span', 'stamp', stamp(record.ts)));

        const body = el('span', 'body');
        if (rawToggle.checked) {
          body.textContent = JSON.stringify(record);
        } else {
          const info = describe(record);
          for (const cls of info.cls.split(' ').filter(Boolean)) line.classList.add(cls);
          body.textContent = info.text;
          if (info.ratio !== null && info.ratio !== undefined) {
            const bar = el('div', 'bar');
            const fill = el('span');
            fill.style.width = `${Math.round(info.ratio * 100)}%`;
            bar.appendChild(fill);
            body.appendChild(bar);
          }
        }
        line.appendChild(body);
        container.appendChild(line);
      }
      container.scrollTop = container.scrollHeight;
    }

    return {
      render,
      push(record, external) {
        records.push({ record, external: external === true });
        // A long session would otherwise grow without bound, and nobody reads
        // six hundred lines back.
        if (records.length > 600) records.splice(0, records.length - 600);
        render();
      },
      clear() {
        records.length = 0;
        render();
      },
    };
  }

  window.TurinkConsole = { create };
})();
