"use client"

import { PaletteProvider } from "../react"
import type { PageTarget } from "../core"

import { PaletteFrame } from "./frame/frame"
import { PaletteBridgeProvider } from "./internal/bridge"
import { PageHost } from "./page-host"

/**
 * Everything stateful: the engine and the frame↔page bridge. It renders no UI
 * of its own, so a host can keep it mounted while the visible surface comes
 * and goes — that is what makes the stack survive a close. `onDismiss` fires
 * when esc is pressed at the root with an empty input.
 *
 * Anything a command needs but cannot reach — a theme setter, a router — is
 * passed in as a child: commands are plain data and cannot call hooks, so a
 * small bridge component mounted here publishes what they need.
 */
export function PaletteRoot({
  rootPage,
  onDismiss,
  children,
}: {
  /** The page the stack starts on, and the one esc unwinds to. */
  rootPage: PageTarget
  onDismiss?: () => void
  children: React.ReactNode
}) {
  return (
    <PaletteProvider rootPage={rootPage} onDismiss={onDismiss}>
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
  return (
    <PaletteFrame revealId={revealId}>
      <PageHost />
    </PaletteFrame>
  )
}

/**
 * The palette as one piece, with no opinion about what surrounds it. Hosts
 * that unmount their container (a dialog, say) should compose `PaletteRoot`
 * and `PaletteSurface` themselves instead, so the stack outlives the close.
 */
export function CommandPalette({
  rootPage,
  onDismiss,
  children,
}: {
  rootPage: PageTarget
  onDismiss?: () => void
  children?: React.ReactNode
}) {
  return (
    <PaletteRoot rootPage={rootPage} onDismiss={onDismiss}>
      {children}
      <PaletteSurface />
    </PaletteRoot>
  )
}
