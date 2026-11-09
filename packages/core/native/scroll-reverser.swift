// Reverses the direction of mouse wheel scrolling and leaves the trackpad alone.
//
// macOS applies "natural scrolling" to the trackpad and to every mouse at once.
// This helper sits in the session's event stream and negates scroll events that
// arrive in notches (a wheel), passing continuous ones (trackpad, Magic Mouse)
// through untouched. It runs as a per-user launch agent that mouse.reverse
// installs and removes; while the agent exists, it keeps running.
//
// Rewriting other applications' events needs the Accessibility permission. The
// permission is tied to this executable, which is why it lives outside the
// application bundle and is replaced only when VERSION changes.
//
// Usage: scroll-reverser --state <file>   run, reporting state to <file>
//        scroll-reverser --version        print VERSION and exit

import ApplicationServices
import Foundation

let VERSION = "1"

let args = CommandLine.arguments
if args.contains("--version") {
  print(VERSION)
  exit(0)
}

let statePath: String? = {
  guard let i = args.firstIndex(of: "--state"), i + 1 < args.count else { return nil }
  return args[i + 1]
}()

var tap: CFMachPort?
var trusted = false

// The core reads this file to tell "waiting for permission" from "working",
// which it cannot learn from launchd alone.
func writeState() {
  guard let statePath else { return }
  let state: [String: Any] = [
    "version": VERSION,
    "pid": Int(getpid()),
    "trusted": trusted,
    "active": tap != nil,
    "updatedAt": ISO8601DateFormatter().string(from: Date()),
  ]
  guard let data = try? JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]) else { return }
  try? data.write(to: URL(fileURLWithPath: statePath), options: .atomic)
}

let integerFields: [CGEventField] = [
  .scrollWheelEventDeltaAxis1, .scrollWheelEventDeltaAxis2,
  .scrollWheelEventPointDeltaAxis1, .scrollWheelEventPointDeltaAxis2,
]
let doubleFields: [CGEventField] = [
  .scrollWheelEventFixedPtDeltaAxis1, .scrollWheelEventFixedPtDeltaAxis2,
]

// Every value is read before any is written, because setting one delta field
// may update the others and negating those again would undo the flip.
func reverse(_ event: CGEvent) {
  let ints = integerFields.map { event.getIntegerValueField($0) }
  let doubles = doubleFields.map { event.getDoubleValueField($0) }
  for (field, value) in zip(integerFields, ints) { event.setIntegerValueField(field, value: -value) }
  for (field, value) in zip(doubleFields, doubles) { event.setDoubleValueField(field, value: -value) }
}

let callback: CGEventTapCallBack = { _, type, event, _ in
  // macOS disables a tap that answers too slowly; turning it back on is the
  // documented recovery.
  if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
    if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
    return Unmanaged.passUnretained(event)
  }
  if type == .scrollWheel && event.getIntegerValueField(.scrollWheelEventIsContinuous) == 0 {
    reverse(event)
  }
  return Unmanaged.passUnretained(event)
}

func startTap() -> Bool {
  let mask = CGEventMask(1 << CGEventType.scrollWheel.rawValue)
  guard let created = CGEvent.tapCreate(
    tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap,
    eventsOfInterest: mask, callback: callback, userInfo: nil
  ) else { return false }
  tap = created
  let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, created, 0)
  CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .commonModes)
  CGEvent.tapEnable(tap: created, enable: true)
  return true
}

// Asking with the prompt option is what puts this helper in the Accessibility
// list, so the person only has to switch it on.
let prompt = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
trusted = AXIsProcessTrustedWithOptions(prompt)
if trusted && !startTap() { FileHandle.standardError.write("event tap could not be created\n".data(using: .utf8)!) }
writeState()

// Permission can be granted while the helper waits, and revoked while it runs.
Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { _ in
  let now = AXIsProcessTrusted()
  var changed = now != trusted
  trusted = now
  if trusted && tap == nil {
    changed = startTap() || changed
  }
  if changed { writeState() }
}

RunLoop.main.run()
