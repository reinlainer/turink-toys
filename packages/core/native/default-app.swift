// Reads and changes which application opens a file type by default.
//
// Launch Services keeps one default per type, and changing it goes through
// NSWorkspace, which on recent macOS asks the person to confirm each type. That
// needs an application context, which is why the core runs this from inside a
// small bundle instead of calling the system API from Node.
//
// Usage: default-app get <uti>...               print { "<uti>": "<bundle id>" | null }
//        default-app set <bundle id> <uti>...   make the application the default,
//                                               one type at a time, and print
//                                               { "<uti>": { result, message? } }
//        default-app --version                  print VERSION and exit
//
// result is "applied" when the application is the default afterwards, "kept"
// when it is not (the person declined), and "error" when the change failed or
// was not answered in time.

import AppKit
import Foundation
import UniformTypeIdentifiers

let VERSION = "1.0.0"

// Each prompt waits for a person, but not forever: a prompt nobody sees would
// otherwise hold the whole run.
let PROMPT_TIMEOUT: TimeInterval = 120

let args = Array(CommandLine.arguments.dropFirst())

func emit(_ object: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
    let text = String(data: data, encoding: .utf8)
  else { return }
  print(text)
  fflush(stdout)
}

func fatal(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(2)
}

func currentDefault(_ uti: String) -> String? {
  guard let type = UTType(uti), let url = NSWorkspace.shared.urlForApplication(toOpen: type) else { return nil }
  return Bundle(url: url)?.bundleIdentifier
}

func setDefault(app: URL, uti: String) -> [String: Any] {
  guard let type = UTType(uti) else { return ["result": "error", "message": "Unknown type \(uti)."] }

  var failure: Error?
  var answered = false
  let done = DispatchSemaphore(value: 0)
  NSWorkspace.shared.setDefaultApplication(at: app, toOpen: type) { error in
    failure = error
    answered = true
    done.signal()
  }
  // This runs off the main thread, so the main run loop stays free to deliver
  // the completion handler and the system's confirmation prompt.
  if done.wait(timeout: .now() + PROMPT_TIMEOUT) == .timedOut {
    return ["result": "error", "message": "No answer within \(Int(PROMPT_TIMEOUT)) seconds."]
  }
  if answered, let failure {
    // Declining the prompt arrives as an error as well; the read-back below
    // tells the two apart, so the message is only kept for a real failure.
    if currentDefault(uti) == Bundle(url: app)?.bundleIdentifier { return ["result": "applied"] }
    let cancelled = (failure as NSError).code == NSUserCancelledError
    if cancelled { return ["result": "kept"] }
    return ["result": "error", "message": failure.localizedDescription]
  }
  return currentDefault(uti) == Bundle(url: app)?.bundleIdentifier ? ["result": "applied"] : ["result": "kept"]
}

switch args.first {
case "--version":
  print(VERSION)
  exit(0)

case "get":
  var out: [String: Any] = [:]
  for uti in args.dropFirst() { out[uti] = currentDefault(uti) ?? NSNull() }
  emit(out)
  exit(0)

case "set":
  guard args.count >= 3 else { fatal("usage: default-app set <bundle id> <uti>...") }
  let bundleId = args[1]
  let types = Array(args.dropFirst(2))
  guard let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) else {
    var out: [String: Any] = [:]
    for uti in types { out[uti] = ["result": "error", "message": "No application with identifier \(bundleId)."] }
    emit(out)
    exit(0)
  }

  // A background-only bundle has no window, but the completion handler and the
  // prompt still need the main run loop turning, so the work runs on a
  // background queue while the main thread runs the application.
  DispatchQueue.global().async {
    var out: [String: Any] = [:]
    for uti in types { out[uti] = setDefault(app: appURL, uti: uti) }
    emit(out)
    exit(0)
  }
  NSApplication.shared.setActivationPolicy(.accessory)
  NSApplication.shared.run()

default:
  fatal("usage: default-app get <uti>... | set <bundle id> <uti>... | --version")
}
