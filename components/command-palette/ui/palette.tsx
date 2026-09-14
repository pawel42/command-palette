"use client"

import { PaletteProvider, usePaletteVisible } from "../react"
import type { PaletteRouting } from "../react"
import type { Command } from "../core"

import { PaletteFrame } from "./frame/frame"
import { PaletteBridgeProvider } from "./internal/bridge"
import { PageHost } from "./page-host"
import { useRootPage } from "./root-page"
import type { RootConfig } from "./root-page"
import type { RoleInput } from "../core/roles"

/**
 * Everything stateful: the engine and the frame↔page bridge. It renders no UI
 * of its own, so a host can keep it mounted while the visible surface comes
 * and goes — that is what makes the stack survive a close. `onDismiss` fires
 * when the palette asks to be closed: esc at the root with an empty input, or
 * a command that called `closePalette()`.
 *
 * Anything a command needs but cannot reach — a theme setter, a router — is
 * passed in as a child: commands are plain data and cannot call hooks, so a
 * small bridge component mounted here publishes what they need.
 */
export function PaletteRoot({
  routing,
  path,
  roles,
  local,
  onDismiss,
  onCommand,
  revealMs,
  children,
  ...root
}: RootConfig & {
  /** The app's routing config — see `PaletteProvider`. */
  routing?: PaletteRouting
  /** Where the user is, said outright — the way out of the above. */
  path?: string
  /** Which roles the user holds — see `PaletteProvider`. */
  roles?: RoleInput
  /** Whether the app is running locally — see `PaletteLocalProvider`. */
  local?: boolean
  onDismiss?: () => void
  /** Every command the palette runs, as it runs — see `PaletteStoreOptions`. */
  onCommand?: (command: Command) => void
  /** How long work must run before the progress bar shows — see `REVEAL_MS`. */
  revealMs?: number
  children: React.ReactNode
}) {
  const rootPage = useRootPage(root)

  return (
    <PaletteProvider
      rootPage={rootPage}
      routing={routing}
      path={path}
      roles={roles}
      local={local}
      onDismiss={onDismiss}
      onCommand={onCommand}
      revealMs={revealMs}
    >
      <PaletteBridgeProvider>{children}</PaletteBridgeProvider>
    </PaletteProvider>
  )
}

/**
 * The visible half: frame and page host. Mounting it is what focuses the
 * palette, so a host can mount and unmount it freely — no state lives here.
 * Must be rendered inside a `PaletteRoot`.
 *
 * A host that hides the surface rather than unmounting it has to say when it
 * comes back, by bumping `revealId` on every reveal. Nothing here could work
 * it out: the DOM is still in place, the effects may never have been torn
 * down, and a reveal would be indistinguishable from an ordinary re-render —
 * which is what decides whether the caret goes back in the input.
 */
export function PaletteSurface({ revealId }: { revealId?: number }) {
  // Mounted is on screen, and on screen is what runs the footer's dismiss
  // timers: an outcome that lands while the palette is shut is waiting, whole,
  // on the next ⌘K rather than having timed out in a window nobody was looking
  // at. A host that hides this rather than unmounting it gets the same, because
  // `Activity` tears down the effects of a hidden tree.
  usePaletteVisible()

  return (
    <PaletteFrame revealId={revealId}>
      <PageHost />
    </PaletteFrame>
  )
}

/**
 * The palette as one piece, rendered where it stands and with no opinion about
 * what surrounds it — for a host that brings its own container, or none at
 * all. `CommandPalette` is the ⌘K dialog, and is what most hosts want.
 *
 * Hosts that unmount their container (a dialog, say) should compose
 * `PaletteRoot` and `PaletteSurface` themselves instead, so the stack outlives
 * the close.
 */
export function InlinePalette({
  routing,
  path,
  roles,
  local,
  onDismiss,
  onCommand,
  revealMs,
  children,
  ...root
}: RootConfig & {
  routing?: PaletteRouting
  path?: string
  roles?: RoleInput
  local?: boolean
  onDismiss?: () => void
  onCommand?: (command: Command) => void
  revealMs?: number
  children?: React.ReactNode
}) {
  return (
    <PaletteRoot
      {...root}
      routing={routing}
      path={path}
      roles={roles}
      local={local}
      onDismiss={onDismiss}
      onCommand={onCommand}
      revealMs={revealMs}
    >
      {children}
      <PaletteSurface />
    </PaletteRoot>
  )
}
