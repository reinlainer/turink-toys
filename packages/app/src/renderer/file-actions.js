'use strict';

// One set of file actions shared by the Images grid, its preview and the
// viewer window: show in Finder, copy the files or their paths, share, and a
// right-click menu that gathers these with the screen's own actions. Acting on
// a picked item acts on every picked item, as Finder does with a selection;
// the caller decides which paths that is and passes them in.

(function () {
  function create({ strings, toast, format }) {
    const f = () => strings().files;

    async function attempt(work, done) {
      try {
        const result = await work();
        if (done) toast(done(result), 'done');
        return result;
      } catch (err) {
        toast(format(f().failed, { message: err && err.message ? err.message : String(err) }), 'error');
        return null;
      }
    }

    const name = (file) => file.split('/').filter(Boolean).pop() || file;

    const actions = {
      reveal: (paths) => attempt(() => window.turink.revealFiles(paths)),
      copy: (paths) =>
        attempt(
          () => window.turink.copyFiles(paths),
          () => (paths.length === 1 ? format(f().copiedOne, { name: name(paths[0]) }) : format(f().copied, { count: paths.length }))
        ),
      copyPath: (paths) =>
        attempt(
          () => window.turink.copyPaths(paths),
          () => (paths.length === 1 ? f().pathCopied : format(f().pathsCopied, { count: paths.length }))
        ),
      // The Share menu opens under the control that asked for it.
      share: (paths, anchor) => {
        const r = anchor && anchor.getBoundingClientRect();
        return attempt(() => window.turink.shareFiles(paths, r ? { x: r.left, y: r.bottom + 4 } : null));
      },
      drag: (paths) => window.turink.dragFiles(paths),
    };

    // spec: { paths, kind: 'file' | 'folder', picked, handlers }. Handlers the
    // caller leaves out are left out of the menu, so the viewer, which has no
    // folder to copy to, shows only what it can do.
    async function menu(spec, at) {
      const s = f();
      const h = spec.handlers || {};
      const paths = spec.paths;
      const many = paths.length > 1;
      const entries = [];
      const add = (id, label, accelerator, run) => entries.push({ id, label, accelerator, run });
      const sep = () => entries.length && entries[entries.length - 1].type !== 'separator' && entries.push({ type: 'separator' });

      if (spec.kind === 'folder') {
        if (h.openFolder) add('open', s.openFolder, 'Cmd+Down', h.openFolder);
        add('reveal', s.reveal, 'Alt+Cmd+R', () => actions.reveal(paths));
        sep();
        add('copyPath', s.copyPath, 'Alt+Cmd+C', () => actions.copyPath(paths));
      } else {
        if (many) entries.push({ header: format(s.selectedHead, { count: paths.length }) });
        if (!many && h.openViewer) add('viewer', s.openViewer, 'Return', h.openViewer);
        if (h.openDefault) add('default', s.openDefault, null, h.openDefault);
        sep();
        add('reveal', s.reveal, 'Alt+Cmd+R', () => actions.reveal(paths));
        if (h.pick) add('pick', spec.picked ? s.deselect : s.select, 'P', h.pick);
        sep();
        add('copy', s.copy, 'Cmd+C', () => actions.copy(paths));
        add('copyPath', s.copyPath, 'Alt+Cmd+C', () => actions.copyPath(paths));
        entries.push({ label: s.share, share: paths });
        if (h.copyTo || h.moveTo) {
          sep();
          if (h.copyTo) add('copyTo', s.copyTo, null, h.copyTo);
          if (h.moveTo) add('moveTo', s.moveTo, null, h.moveTo);
        }
        if (h.trash) {
          sep();
          add('trash', s.trash, 'Cmd+Backspace', h.trash);
        }
      }

      const wire = entries.map(({ run, ...rest }) => rest);
      const chosen = await window.turink.fileMenu(wire, at);
      const entry = entries.find((e) => e.id && e.id === chosen);
      if (entry && entry.run) await entry.run();
    }

    return { ...actions, menu };
  }

  window.TurinkFileActions = { create };
})();
