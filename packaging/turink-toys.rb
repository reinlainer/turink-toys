# Homebrew cask for Turink Toys.
#
# This copy is the source of truth. A release workflow substitutes the version
# and checksum and commits the result to the tap repository, so the two never
# drift by hand.
#
# The binary stanza links the launcher inside the bundle rather than shipping a
# second copy of the runtime: one install serves both the window and the command.
# The postflight step clears the quarantine attribute, which is what lets an
# unsigned build launch without the user visiting System Settings.

cask "turink-toys" do
  version "__VERSION__"
  sha256 "__SHA256__"

  url "https://github.com/reinlainer/turink-toys/releases/download/v#{version}/turink-toys-#{version}.zip"
  name "Turink Toys"
  desc "Utilities that people and AI agents drive through the same core"
  homepage "https://github.com/reinlainer/turink-toys"

  depends_on macos: :big_sur

  app "Turink Toys.app"
  binary "#{appdir}/Turink Toys.app/Contents/Resources/app/packages/cli/bin/turink-toys"

  postflight_steps do
    run "/usr/bin/xattr",
        args:         ["-dr", "com.apple.quarantine", "{{appdir}}/Turink Toys.app"],
        must_succeed: false
  end

  zap trash: "~/Library/Application Support/turink-toys"
end
