#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// Installs Finder quick actions into ~/Library/Services. Each one is an
// Automator workflow bundle whose single step runs the turink-toys command with
// the selected items passed as arguments.
//
// Passing every selection as a separate argument is the reason the tasks accept
// a list of targets. A quick action cannot ask the user anything, so the
// commands it invokes have to complete on their own and report through
// Notification Center.

const SERVICES_DIR = path.join(os.homedir(), 'Library', 'Services');

const ACTIONS = [
  {
    name: 'Compress for Windows',
    identifier: 'toys.turink.quickaction.compress',
    sendTypes: ['public.item'],
    task: 'archive.compress',
    successLabel: 'Archive created',
  },
  {
    name: 'Extract Safely',
    identifier: 'toys.turink.quickaction.extract',
    sendTypes: ['com.pkware.zip-archive'],
    task: 'archive.extract',
    extraArgs: ['--auto'],
    successLabel: 'Archive extracted',
  },
  {
    name: 'Check Windows Compatibility',
    identifier: 'toys.turink.quickaction.verify',
    sendTypes: ['com.pkware.zip-archive'],
    task: 'archive.verify',
    successLabel: 'Check complete',
  },
];

// A quick action runs with a minimal PATH, so the command is resolved at
// install time and written into the script as an absolute path.
function resolveCommand() {
  const override = process.env.TURINK_TOYS_BIN;
  if (override && fs.existsSync(override)) return override;

  try {
    return execFileSync('/usr/bin/which', ['turink-toys'], { encoding: 'utf8' }).trim();
  } catch {
    const local = path.resolve(__dirname, '..', '..', 'packages', 'cli', 'src', 'main.js');
    if (fs.existsSync(local)) return local;
    throw new Error(
      'Cannot find the turink-toys command. Install it first, or set TURINK_TOYS_BIN.'
    );
  }
}

function shellScript(command, action) {
  const args = [action.task, '"$@"', ...(action.extraArgs || []), '--json'].join(' ');
  // The result is invisible in Finder, so both outcomes are announced. The
  // failure notice carries the error code, which is what makes the run
  // traceable through "turink-toys runs list".
  return `#!/bin/sh
OUTPUT=$(${JSON.stringify(command)} ${args} 2>&1)
STATUS=$?
if [ $STATUS -eq 0 ]; then
  MESSAGE=${JSON.stringify(action.successLabel)}
else
  MESSAGE=$(printf '%s' "$OUTPUT" | /usr/bin/sed -n 's/.*"code":"\\([^"]*\\)".*/\\1/p')
  [ -z "$MESSAGE" ] && MESSAGE="Failed"
fi
/usr/bin/osascript -e "display notification \\"$MESSAGE\\" with title \\"Turink Toys\\""
exit 0
`;
}

function uuid() {
  return crypto.randomUUID().toUpperCase();
}

function workflowDocument(command, action) {
  return {
    AMApplicationBuild: '523',
    AMApplicationVersion: '2.10',
    AMDocumentVersion: '2',
    actions: [
      {
        action: {
          ActionBundlePath: '/System/Library/Automator/Run Shell Script.action',
          ActionName: 'Run Shell Script',
          ActionParameters: {
            COMMAND_STRING: shellScript(command, action),
            CheckedForUserDefaultShell: true,
            inputMethod: 1, // Selected items arrive as arguments, not on stdin.
            shell: '/bin/sh',
            source: '',
          },
          AMAccepts: {
            Container: 'List',
            Optional: true,
            Types: ['com.apple.cocoa.string'],
          },
          AMActionVersion: '2.0.3',
          AMParameterProperties: {
            COMMAND_STRING: {},
            CheckedForUserDefaultShell: {},
            inputMethod: {},
            shell: {},
            source: {},
          },
          AMProvides: {
            Container: 'List',
            Types: ['com.apple.cocoa.string'],
          },
          BundleIdentifier: 'com.apple.RunShellScript',
          CFBundleVersion: '2.0.3',
          CanShowSelectedItemsWhenRun: false,
          CanShowWhenRun: true,
          Category: ['AMCategoryUtilities'],
          Class_Name: 'RunShellScriptAction',
          InputUUID: uuid(),
          Keywords: ['Shell', 'Script', 'Command', 'Run', 'Unix'],
          OutputUUID: uuid(),
          UUID: uuid(),
          UnlocalizedApplications: ['Automator'],
        },
      },
    ],
    connectors: {},
    workflowMetaData: {
      serviceInputTypeIdentifier: 'com.apple.Automator.fileSystemObject',
      serviceOutputTypeIdentifier: 'com.apple.Automator.nothing',
      serviceApplicationBundleID: 'com.apple.finder',
      serviceApplicationPath: '/System/Library/CoreServices/Finder.app',
      serviceProcessesInput: 0,
      workflowTypeIdentifier: 'com.apple.Automator.servicesMenu',
    },
  };
}

function infoPlist(action) {
  return {
    CFBundleIdentifier: action.identifier,
    CFBundleName: action.name,
    CFBundlePackageType: 'BNDL',
    CFBundleShortVersionString: '1.0',
    NSServices: [
      {
        NSMenuItem: { default: action.name },
        NSMessage: 'runWorkflowAsService',
        NSRequiredContext: { NSApplicationIdentifier: 'com.apple.finder' },
        NSSendFileTypes: action.sendTypes,
      },
    ],
  };
}

// plutil converts JSON to a binary property list, which avoids hand-writing XML
// and escaping the shell script by hand.
function writePlist(target, value) {
  const temp = `${target}.json`;
  fs.writeFileSync(temp, JSON.stringify(value));
  execFileSync('/usr/bin/plutil', ['-convert', 'binary1', temp, '-o', target]);
  fs.rmSync(temp, { force: true });
}

function install(action, command) {
  const bundle = path.join(SERVICES_DIR, `${action.name}.workflow`);
  fs.rmSync(bundle, { recursive: true, force: true });
  fs.mkdirSync(path.join(bundle, 'Contents', 'Resources'), { recursive: true });

  writePlist(path.join(bundle, 'Contents', 'Info.plist'), infoPlist(action));
  writePlist(
    path.join(bundle, 'Contents', 'Resources', 'document.wflow'),
    workflowDocument(command, action)
  );

  return bundle;
}

function uninstall() {
  let removed = 0;
  for (const action of ACTIONS) {
    const bundle = path.join(SERVICES_DIR, `${action.name}.workflow`);
    if (fs.existsSync(bundle)) {
      fs.rmSync(bundle, { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

function refreshServices() {
  // The services cache only picks up a new workflow after pbs rescans, and
  // Finder reads the menu once per launch.
  try {
    execFileSync('/System/Library/CoreServices/pbs', ['-flush']);
  } catch {
    // Older releases expose no flush option; the rebuild below still applies.
  }
  try {
    execFileSync('/System/Library/CoreServices/pbs', ['-update']);
  } catch {
    // Not fatal. The menu appears after the next login if this fails.
  }
}

function main() {
  const mode = process.argv[2] || 'install';

  if (mode === 'uninstall') {
    const removed = uninstall();
    refreshServices();
    process.stdout.write(`Removed ${removed} quick action(s).\n`);
    return;
  }

  const command = resolveCommand();
  fs.mkdirSync(SERVICES_DIR, { recursive: true });

  const installed = ACTIONS.map((action) => install(action, command));
  refreshServices();

  process.stdout.write(`Installed ${installed.length} quick action(s) using ${command}\n`);
  for (const bundle of installed) process.stdout.write(`  ${bundle}\n`);
  process.stdout.write(
    '\nThey appear under Quick Actions in the Finder context menu.\n' +
      'Assign shortcuts under System Settings > Keyboard > Keyboard Shortcuts > Services.\n'
  );
}

if (require.main === module) main();

module.exports = { ACTIONS, install, uninstall, resolveCommand, SERVICES_DIR };
