# turink-toys

macOS housekeeping utilities that people and AI agents drive through the same core.

Most desktop utilities are built for a person clicking buttons, and an agent that
needs the same work done is left scraping human-readable output. This tool treats
both as first-class callers. A graphical window, a Finder context menu, a terminal
command and an agent all reach identical code, and the executable describes its
own capabilities so an agent can discover and call them without external
documentation.

## Status

Under development. The core, the command line interface, the Finder quick
actions and the desktop application work. Packaging and distribution are not
built yet, so the app runs from source.

## What it does

| Command | Purpose |
|:---|:---|
| `archive.compress` | Create a zip archive that extracts correctly on Windows |
| `archive.extract` | Extract an archive, recovering names written in a legacy code page |
| `archive.inspect` | Report the contents, encoding and flags of an archive |
| `archive.verify` | Check whether an existing archive will extract cleanly on Windows |
| `disk.targets` | List cleanup locations, their slugs and what removing each costs |
| `disk.report` | Measure how much space developer caches occupy |
| `disk.clean` | Move caches and unused toolchains to the Trash |
| `disk.restore` | Return items a previous cleanup moved to the Trash |
| `power.status` | Report the current sleep and lid settings |
| `power.lid` | Choose whether closing the lid puts the machine to sleep |
| `power.keep-awake` | Suppress idle sleep for a set number of minutes |

### The archive problem

macOS writes zip archives without the UTF-8 filename flag. Windows Explorer then
decodes those names with the system code page and shows unreadable text. macOS
also stores names in decomposed form while Windows expects composed form, and it
permits characters such as `:` that Windows rejects outright.

`archive.compress` sets the flag, normalises names and substitutes characters
Windows cannot create, reporting every substitution rather than renaming
silently. `archive.extract` handles the reverse case, recovering names from an
archive that arrived without the flag.

## Usage

```
turink-toys <domain>.<verb> [targets...] [options]
```

```bash
turink-toys archive.compress ~/Documents/report
turink-toys archive.verify ~/Desktop/bundle.zip
turink-toys disk.report
turink-toys power.status
```

Three output modes are available. The default prints formatted text, `--json`
prints a single result object, and `--stream` prints every event as NDJSON.

## For agents

The executable is the documentation. Nothing needs to be installed or configured
beyond the binary itself.

```bash
turink-toys capabilities --brief    # task list with purpose, risk and cost
turink-toys help <task>             # arguments, examples and error codes
turink-toys capabilities --json     # full manifests and input schemas
```

Start with `capabilities --brief`, which is small enough to read in full, then
call `help <task>` for the one task you need. Reading every schema up front
wastes context.

Every failure carries a stable code and a hint naming the next command:

```json
{
  "status": "error",
  "error": {
    "code": "ENCODING_AMBIGUOUS",
    "message": "3 name(s) lack the UTF-8 flag, so the code page has to be chosen.",
    "hint": "Re-run with --encoding euc-kr, or with --auto to accept the top candidate.",
    "retryable": true
  }
}
```

Tasks never wait for input. Where a choice is required, the task returns the
candidates and stops so the caller can decide and call again.

### Confirming destructive work

Anything that cannot be undone computes a plan first and refuses to act until
that plan's hash comes back:

```bash
$ turink-toys disk.clean --targets xcode.deriveddata --json
{"status":"needs_confirm","plan":{"hash":"sha256:9f3c…","summary":"3 path(s), 18.4 GB"}}

$ turink-toys disk.clean --targets xcode.deriveddata --confirm sha256:9f3c… --json
{"status":"ok","result":{"freedReadable":"18.4 GB"}}
```

If the filesystem changes in between, the recomputed hash differs and the run
stops rather than acting on a stale picture.

`turink-toys agent-snippet` prints a paragraph to paste into an agent instruction
file. It writes nothing itself.

## Exit codes

| Code | Meaning |
|:---|:---|
| 0 | Success |
| 1 | Failure during execution |
| 2 | Usage or argument error |
| 3 | Confirmation or acknowledgement required |
| 4 | Administrator rights required |
| 5 | Plan no longer matches the filesystem |
| 6 | Partial completion |
| 7 | Another run holds the domain lock |

## Safety

Tasks declare a risk level that determines what happens before they run.

| Level | Behaviour |
|:---|:---|
| `read` | Runs without confirmation |
| `create` | Never overwrites an existing file; picks a free name instead |
| `mutate` | Requires administrator rights and verifies the change afterwards |
| `destroy` | Requires a confirmed plan hash and moves to the Trash rather than deleting |

Path validation lives in one place in the core, so no front end can reach a task
without passing it. Deletion is confined to the home directory.

Cleanup locations are classified by what they hold rather than by whether
removing them is permitted. A `cache` is rebuilt automatically by the tool that
owns it. A `toolchain` has to be downloaded and installed again, so `disk.clean`
states the consequence and asks for `--include-toolchains` before touching one.
Both can be removed: whether an Android SDK or a set of simulator devices earns
its disk space depends on how often that toolchain is used, which only its owner
knows.

The built-in list suits a machine in active development. To reclassify an entry
or add a location of your own, write
`~/Library/Application Support/turink-toys/targets.json`:

```json
{
  "overrides": { "xcode.simulators": { "kind": "cache" } },
  "targets": [
    { "slug": "my.renders", "name": "Render output", "path": "~/Work/renders", "kind": "cache" }
  ]
}
```

Custom entries pass through the same checks as built-in ones.

Raising privilege is confined to the `power` domain. Because an agent cannot
answer an authentication prompt, `power.lid` returns exit code 4 with an
explanation rather than failing opaquely.

Every run writes an NDJSON journal under
`~/Library/Application Support/turink-toys/runs/`, which is how the graphical
application and the command line observe each other's work. Entries older than
thirty days are swept once a day, on the first run after the interval passes.

## Desktop application

```bash
npm install
npm run app
```

The window lists every task on the left, generates its input form from the task
manifest, and streams events into a console at the bottom. A field whose values
come from a fixed set says so in the schema, and the form opens a picker for it
rather than asking anyone to recall an identifier. The command shown
beside the Run button reproduces the same work in a terminal, which is how a
run started by hand becomes something to paste into a script or hand to an
agent.

A menu bar item carries the current lid setting, anything still running, and a
shortcut to compress a selection.

The console also shows runs this window did not start. A task invoked from the
terminal or from a Finder quick action writes to the same journal, and the app
tails that directory, so an agent working in the background stays visible.

## Language

English and Korean are available. The window follows the system language on
first launch and remembers a choice made in the selector at the bottom of the
sidebar. The command line accepts `--lang ko`, and `TURINK_TOYS_LANG` overrides
both without touching the machine's own settings.

Only text a person reads is translated. Error codes, JSON field names and the
hints an agent parses stay in English in every locale, because a caller that
branches on a code must not depend on which language the machine happens to be
set to.

```bash
turink-toys disk.clean --targets android.sdk --lang ko
# NEEDS_ACKNOWLEDGEMENT: 선택한 대상 가운데 재설치가 필요한 항목이 있습니다.

turink-toys disk.clean --targets android.sdk --lang ko --json
# {"error":{"code":"NEEDS_ACKNOWLEDGEMENT","message":"1 target(s) have to be …
```

Adding a language means one file under `packages/core/src/i18n/`. English lives
in the task manifests themselves, so an untranslated string falls back to real
text rather than to a key.

## Building a bundle

Running from source shows Electron's own name in the menu bar and the Dock,
because macOS reads those from the running bundle rather than from anything the
process sets. Building one carries the product name instead:

```bash
npm run bundle
open "build/Turink Toys.app"
```

The result is unsigned and meant for local use. The identifier and the command
line tool stay `turink-toys`; everything a person reads says Turink Toys.

## Finder quick actions

```bash
node integrations/quick-actions/install.js
```

Installs Compress for Windows, Extract Safely and Check Windows Compatibility
into `~/Library/Services`. They appear under Quick Actions in the Finder context
menu and accept a multiple selection. Results arrive through Notification
Center, since a quick action has nowhere else to report.

Pass `uninstall` to remove them. Assign keyboard shortcuts under System
Settings > Keyboard > Keyboard Shortcuts > Services.

## Development

```bash
npm install
node packages/cli/src/main.js --help
npm test
```

| Package | Contents |
|:---|:---|
| `packages/core` | Task kernel and implementations. No user interface dependencies |
| `packages/cli` | Command line front end |
| `packages/app` | Electron main process and renderer |
| `packages/core/src/i18n` | Interface translations |
| `packages/app/assets` | Icon sources |

Icons are drawn as SVG and rasterised by Electron, which is already a
dependency, so no image toolchain is required:

```bash
npm run icons
```

That writes `packages/app/assets/generated/`, holding the `.icns` for packaging,
a PNG for the Dock while running from source, and the menu bar template images.
Regenerate it after editing either SVG.

Adding a task means creating one manifest under `packages/core/src/tasks/` and
requiring it from `packages/core/src/index.js`. The argument parser, the usage
output, the help text and the window's input form all read from the manifest,
so no other file changes.

Requires macOS and Node.js 20 or later.

## License

MIT
