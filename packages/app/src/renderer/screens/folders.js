'use strict';

// The folders a person opens often. The menu bar opens them; this screen is
// where the list is edited. Every change goes through a folders.* task, so the
// command line sees the same list, and none of them leaves a journal entry
// because editing a preference is not work done on the machine.
//
// Folders outside any group sit in the first card. Each optional group is a
// card of its own below it, in the group order.

(function () {
  const screens = (window.TurinkScreens = window.TurinkScreens || []);

  // A row or a group being reordered is told apart from files dragged in from
  // Finder by these types, which only this screen puts on a drag.
  const ROW_TYPE = 'application/x-turink-folder';
  const GROUP_TYPE = 'application/x-turink-folder-group';

  screens.push({
    id: 'folders',
    icon: 'folder',
    tasks: [
      'folders.list',
      'folders.add',
      'folders.remove',
      'folders.reorder',
      'folders.rename',
      'folders.open',
      'folders.add-group',
      'folders.rename-group',
      'folders.remove-group',
      'folders.reorder-group',
    ],

    mount(root, ctx) {
      const { el, icon, s, format } = ctx;
      const t = () => s().folders;
      // editing: a folder path, or "group:<name>" while a group is renamed.
      const state = { folders: [], groups: [], loaded: false, editing: null, dragging: null };

      const head = el('div', 'folders-head');
      head.appendChild(ctx.header(s().nav.folders, t().subtitle));
      const buttons = el('div', 'folders-buttons');
      const groupButton = el('button', 'button');
      groupButton.type = 'button';
      groupButton.append(icon('plus', null, 14), el('span', null, t().addGroup));
      groupButton.addEventListener('click', createGroup);
      const addButton = el('button', 'button primary');
      addButton.type = 'button';
      addButton.append(icon('plus', null, 14), el('span', null, t().add));
      addButton.addEventListener('click', () => pick(null));
      buttons.append(groupButton, addButton);
      head.appendChild(buttons);

      const body = el('div', 'folders-body');
      root.append(head, body);

      // ------------------------------------------------ where a folder lives

      function placeNames() {
        return {
          desktop: t().placeDesktop,
          documents: t().placeDocuments,
          downloads: t().placeDownloads,
          home: t().placeHome,
          icloud: t().placeIcloud,
          onedrive: t().placeOnedrive,
          gdrive: t().placeGdrive,
          dropbox: t().placeDropbox,
          disk: t().placeDisk,
        };
      }

      // The full path is in each row's tooltip.
      const whereLine = (folder) => window.TurinkFolderNames.whereLine(folder, placeNames());
      const shownName = (folder) => window.TurinkFolderNames.shownName(folder, placeNames());

      const membersOf = (group) => state.folders.filter((folder) => (folder.group || null) === group);

      // ------------------------------------------------ data

      function take(result) {
        if (result.folders) state.folders = result.folders;
        if (result.groups) state.groups = result.groups;
      }

      async function load() {
        const outcome = await ctx.peek('folders.list');
        state.loaded = true;
        if (outcome.ok) take(outcome.result);
        render();
      }

      // Edits run quietly; the list the task returns is the one shown, so the
      // screen never drifts from what was saved.
      async function change(taskId, input) {
        const outcome = await ctx.peek(taskId, input);
        if (!outcome.ok) {
          ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
          render();
          return null;
        }
        take(outcome.result);
        render();
        return outcome.result;
      }

      async function addPaths(paths, group) {
        let added = 0;
        let duplicate = 0;
        let refused = 0;
        for (const target of paths) {
          const outcome = await ctx.peek('folders.add', group ? { path: target, group } : { path: target });
          if (!outcome.ok) refused += 1;
          else if (outcome.result.added) {
            added += 1;
            take(outcome.result);
          } else duplicate += 1;
        }
        render();
        if (added > 0) ctx.toast(format(t().added, { count: added }), 'done');
        else if (refused > 0) ctx.toast(t().onlyFolders, 'error');
        else if (duplicate > 0) ctx.toast(t().alreadySaved, 'done');
      }

      async function pick(group) {
        const paths = await window.turink.pickPaths(true);
        if (paths.length > 0) await addPaths(paths, group);
      }

      async function remove(folder) {
        const section = folder.group || null;
        const position = membersOf(section).indexOf(folder) + 1;
        const result = await change('folders.remove', { path: folder.path });
        if (!result) return;
        ctx.toast(format(t().removed, { name: shownName(folder) }), 'done', {
          label: s().undo,
          run: async () => {
            const input = { path: folder.path };
            if (folder.customName) input.name = folder.name;
            if (section) input.group = section;
            const back = await change('folders.add', input);
            if (back && back.added && position < membersOf(section).length) {
              await change('folders.reorder', { path: folder.path, position });
            }
          },
        });
      }

      async function open(folder) {
        if (!folder.available) return;
        const outcome = await ctx.peek('folders.open', { path: folder.path });
        if (!outcome.ok) {
          ctx.toast([outcome.error.message, outcome.error.hint].filter(Boolean).join(' '), 'error');
          load();
        }
      }

      async function copyPath(folder) {
        try {
          await navigator.clipboard.writeText(folder.path);
          ctx.toast(t().copied, 'done');
        } catch {
          // Clipboard access can be refused; the path is still in the tooltip.
        }
      }

      // Moving a folder names its section explicitly, so the same call serves a
      // move within a card and a move into another one.
      function moveTo(path, group, position) {
        return change('folders.reorder', group ? { path, group, position } : { path, ungrouped: true, position });
      }

      // ------------------------------------------------ groups

      // A new group gets a free placeholder name and opens straight into
      // renaming, so creating and naming feel like one step.
      async function createGroup() {
        const taken = new Set(state.groups.map((group) => group.name.toLocaleLowerCase()));
        let name = t().newGroup;
        for (let n = 2; taken.has(name.toLocaleLowerCase()); n += 1) name = `${t().newGroup} ${n}`;
        const result = await change('folders.add-group', { name });
        if (!result) return;
        state.editing = `group:${result.name}`;
        render();
      }

      async function removeGroup(group) {
        const position = state.groups.findIndex((g) => g.name === group.name) + 1;
        const members = membersOf(group.name).map((folder) => folder.path);
        const result = await change('folders.remove-group', { group: group.name });
        if (!result) return;
        ctx.toast(format(members.length > 0 ? t().groupRemoved : t().groupRemovedEmpty, { name: group.name }), 'done', {
          label: s().undo,
          run: async () => {
            const back = await change('folders.add-group', { name: group.name, position });
            if (!back) return;
            for (let i = 0; i < members.length; i += 1) await moveTo(members[i], group.name, i + 1);
          },
        });
      }

      // ------------------------------------------------ drag and drop

      function droppedPaths(event) {
        return [...event.dataTransfer.files].map((file) => window.turink.pathForFile(file)).filter(Boolean);
      }

      const types = (event) => [...event.dataTransfer.types];
      const isRowDrag = (event) => types(event).includes(ROW_TYPE);
      const isGroupDrag = (event) => types(event).includes(GROUP_TYPE);
      const isFileDrag = (event) => types(event).includes('Files');

      function clearMarks() {
        for (const node of body.querySelectorAll('.drop-before, .drop-after, .drop-active')) {
          node.classList.remove('drop-before', 'drop-after', 'drop-active');
        }
      }

      // Each card takes Finder folders into its own section, takes a row
      // dropped on its empty space to the end of that section, and, for a group
      // card, takes another group dropped above or below it.
      function wireCard(card, group) {
        card.addEventListener('dragover', (event) => {
          if (isGroupDrag(event)) {
            if (!group || state.dragging === `group:${group}`) return;
            event.preventDefault();
            const box = card.getBoundingClientRect();
            const after = event.clientY > box.top + box.height / 2;
            card.classList.toggle('drop-after', after);
            card.classList.toggle('drop-before', !after);
            return;
          }
          if (!isFileDrag(event) && !isRowDrag(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = isRowDrag(event) ? 'move' : 'copy';
          card.classList.add('drop-active');
        });
        card.addEventListener('dragleave', (event) => {
          if (!card.contains(event.relatedTarget)) card.classList.remove('drop-active', 'drop-before', 'drop-after');
        });
        card.addEventListener('drop', (event) => {
          if (isGroupDrag(event)) {
            if (!group) return;
            event.preventDefault();
            const after = card.classList.contains('drop-after');
            clearMarks();
            const moving = event.dataTransfer.getData(GROUP_TYPE);
            const names = state.groups.map((g) => g.name);
            const from = names.indexOf(moving);
            let to = names.indexOf(group) + (after ? 1 : 0);
            if (from === -1 || moving === group) return;
            if (from < to) to -= 1;
            if (to !== from) change('folders.reorder-group', { group: moving, position: to + 1 });
            return;
          }
          event.preventDefault();
          clearMarks();
          if (isRowDrag(event)) {
            const moving = event.dataTransfer.getData(ROW_TYPE);
            moveTo(moving, group, membersOf(group).length + 1);
            return;
          }
          const paths = droppedPaths(event);
          if (paths.length > 0) addPaths(paths, group);
        });
      }

      // ------------------------------------------------ rows

      function actionButton(name, label, onClick, tone) {
        const button = el('button', 'icon-button folder-action' + (tone ? ` ${tone}` : ''));
        button.type = 'button';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.appendChild(icon(name, null, 15));
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          onClick();
        });
        return button;
      }

      // One inline editor for folder and group names: Enter or leaving the
      // field saves, Escape cancels.
      function inlineEditor({ value, placeholder, title, label, className, save }) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = className;
        input.value = value;
        input.placeholder = placeholder;
        if (title) input.title = title;
        input.setAttribute('aria-label', label);
        let done = false;
        const finish = async (keep) => {
          if (done) return;
          done = true;
          state.editing = null;
          if (keep && (await save(input.value.trim()))) return;
          render();
        };
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') finish(true);
          if (event.key === 'Escape') finish(false);
        });
        input.addEventListener('blur', () => finish(true));
        input.addEventListener('click', (event) => event.stopPropagation());
        input.addEventListener('mousedown', (event) => event.stopPropagation());
        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });
        return input;
      }

      function startEditing(key) {
        state.editing = key;
        render();
      }

      function row(folder, index, group) {
        const node = el('div', 'folder-row' + (folder.available ? '' : ' unavailable'));
        node.title = folder.path;
        node.draggable = state.editing !== folder.path;
        node.tabIndex = 0;
        node.dataset.path = folder.path;

        node.appendChild(icon('grip', 'folder-grip', 16));
        const badge = el('span', 'folder-icon');
        badge.appendChild(icon('folder', null, 17));
        node.appendChild(badge);

        const text = el('div', 'folder-text');
        if (state.editing === folder.path) {
          const current = folder.customName ? folder.name : '';
          text.appendChild(
            inlineEditor({
              value: current,
              placeholder: folder.folderName,
              title: t().renamePlaceholder,
              label: t().rename,
              className: 'folder-rename',
              save: async (next) => next !== current && Boolean(await change('folders.rename', { path: folder.path, name: next || undefined })),
            })
          );
        } else {
          text.appendChild(el('span', 'folder-name', shownName(folder)));
        }
        text.appendChild(el('span', 'folder-where', folder.available ? whereLine(folder) : `${whereLine(folder)} · ${t().notConnected}`));
        node.appendChild(text);

        const actions = el('div', 'folder-actions');
        if (folder.available) actions.appendChild(actionButton('external', t().open, () => open(folder)));
        actions.appendChild(actionButton('copy', t().copy, () => copyPath(folder)));
        actions.appendChild(actionButton('pencil', t().rename, () => startEditing(folder.path)));
        actions.appendChild(actionButton('close', t().remove, () => remove(folder), 'danger'));
        node.appendChild(actions);

        node.addEventListener('click', () => open(folder));
        node.addEventListener('keydown', (event) => {
          if (event.target !== node) return;
          if (event.key === 'Enter') open(folder);
          if (event.key === 'F2') startEditing(folder.path);
          // ⌥↑ and ⌥↓ move a row within its card without a mouse.
          if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            const to = index + 1 + (event.key === 'ArrowUp' ? -1 : 1);
            if (to >= 1 && to <= membersOf(group).length) {
              moveTo(folder.path, group, to).then(() => {
                const moved = body.querySelector(`.folder-row[data-path="${CSS.escape(folder.path)}"]`);
                if (moved) moved.focus();
              });
            }
          }
        });

        node.addEventListener('dragstart', (event) => {
          event.stopPropagation();
          state.dragging = folder.path;
          event.dataTransfer.setData(ROW_TYPE, folder.path);
          event.dataTransfer.effectAllowed = 'move';
          node.classList.add('dragging');
          body.classList.add('dragging-row');
        });
        node.addEventListener('dragend', () => {
          state.dragging = null;
          node.classList.remove('dragging');
          body.classList.remove('dragging-row');
          clearMarks();
        });
        node.addEventListener('dragover', (event) => {
          if (!isRowDrag(event) || state.dragging === folder.path) return;
          event.preventDefault();
          event.stopPropagation();
          // Measured against the row itself: the event often fires on the name
          // or an icon inside it, whose own offset would put the line wrong.
          const box = node.getBoundingClientRect();
          const after = event.clientY > box.top + box.height / 2;
          node.classList.toggle('drop-after', after);
          node.classList.toggle('drop-before', !after);
        });
        node.addEventListener('dragleave', () => node.classList.remove('drop-before', 'drop-after'));
        node.addEventListener('drop', (event) => {
          if (!isRowDrag(event)) return;
          event.preventDefault();
          event.stopPropagation();
          const after = node.classList.contains('drop-after');
          clearMarks();
          const moving = event.dataTransfer.getData(ROW_TYPE);
          if (moving === folder.path) return;
          // Positions count from 1 within the card. Taking a row out of the
          // same card first shifts the ones below it up by one.
          const members = membersOf(group);
          const from = members.findIndex((f) => f.path === moving);
          let to = index + (after ? 1 : 0);
          if (from !== -1 && from < to) to -= 1;
          if (from === -1 || to !== from) moveTo(moving, group, to + 1);
        });

        return node;
      }

      // ------------------------------------------------ cards

      function groupHead(group) {
        const headRow = el('div', 'folder-group-head');
        headRow.draggable = state.editing !== `group:${group.name}`;
        headRow.appendChild(icon('grip', 'folder-grip', 16));

        if (state.editing === `group:${group.name}`) {
          headRow.appendChild(
            inlineEditor({
              value: group.name,
              placeholder: t().groupNamePlaceholder,
              label: t().groupRename,
              className: 'folder-group-rename',
              save: async (next) =>
                Boolean(next) && next !== group.name && Boolean(await change('folders.rename-group', { group: group.name, name: next })),
            })
          );
        } else {
          const title = el('h2', 'folder-group-name', group.name);
          title.addEventListener('dblclick', () => startEditing(`group:${group.name}`));
          headRow.appendChild(title);
        }
        headRow.appendChild(el('span', 'folder-group-count', String(group.count)));

        const actions = el('div', 'folder-actions');
        actions.appendChild(actionButton('plus', t().addToGroup, () => pick(group.name)));
        actions.appendChild(actionButton('pencil', t().groupRename, () => startEditing(`group:${group.name}`)));
        actions.appendChild(actionButton('close', t().groupRemove, () => removeGroup(group), 'danger'));
        headRow.appendChild(actions);

        headRow.addEventListener('dragstart', (event) => {
          state.dragging = `group:${group.name}`;
          event.dataTransfer.setData(GROUP_TYPE, group.name);
          event.dataTransfer.effectAllowed = 'move';
          headRow.closest('.folders-card').classList.add('dragging');
        });
        headRow.addEventListener('dragend', () => {
          state.dragging = null;
          const card = headRow.closest('.folders-card');
          if (card) card.classList.remove('dragging');
          clearMarks();
        });
        return headRow;
      }

      function sectionCard(group, folders, groupInfo) {
        const card = el('section', 'card folders-card' + (group ? ' is-group' : ' is-ungrouped'));
        if (groupInfo) card.appendChild(groupHead(groupInfo));
        if (folders.length > 0) {
          const list = el('div', 'folder-list');
          folders.forEach((folder, index) => list.appendChild(row(folder, index, group)));
          card.appendChild(list);
        } else {
          const hint = el('div', 'folder-group-empty');
          hint.append(icon('drop', null, 14), el('span', null, group ? t().groupEmpty : t().ungroupedDrop));
          card.appendChild(hint);
        }
        wireCard(card, group);
        return card;
      }

      function emptyState() {
        const card = el('section', 'card folders-card is-empty');
        const box = el('div', 'folders-empty');
        const mark = el('span', 'folders-empty-icon');
        mark.appendChild(icon('folder', null, 26));
        box.appendChild(mark);
        box.appendChild(el('strong', null, t().emptyTitle));
        box.appendChild(el('p', null, t().emptyBody));
        const ways = el('div', 'folders-ways');
        for (const [title, text] of [
          [t().emptyDrop, t().emptyDropBody],
          [t().emptyMenu, t().emptyMenuBody],
          [t().emptyButton, t().emptyButtonBody],
        ]) {
          const way = el('div', 'folders-way');
          way.append(el('strong', null, title), el('span', null, text));
          ways.appendChild(way);
        }
        box.appendChild(ways);
        card.appendChild(box);
        wireCard(card, null);
        return card;
      }

      function render() {
        body.textContent = '';
        if (!state.loaded) return;
        if (state.folders.length === 0 && state.groups.length === 0) {
          body.appendChild(emptyState());
          return;
        }

        // The ungrouped card is always there once groups exist, so a folder
        // can be dragged back out of a group.
        const loose = membersOf(null);
        if (loose.length > 0 || state.groups.length > 0) body.appendChild(sectionCard(null, loose, null));
        for (const group of state.groups) body.appendChild(sectionCard(group.name, membersOf(group.name), group));

        const hint = el('div', 'folders-hint');
        hint.append(icon('drop', null, 14), el('span', null, t().dropHint));
        body.appendChild(hint);
      }

      // The list can change from the menu bar or the command line while this
      // screen is open. A rename or a drag in progress is not interrupted.
      this.onFoldersChanged = () => {
        if (!state.editing && !state.dragging) load();
      };

      load();
    },
  });
})();
