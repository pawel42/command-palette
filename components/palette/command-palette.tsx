"use client"

import { PaletteProvider } from "@/lib/palette/react"

import { PaletteBridgeProvider } from "./bridge"
import { rootPage } from "./commands"
import { PaletteFrame } from "./frame"
import { PageHost } from "./page-host"
import { ThemeCommandBridge } from "./theme-bridge"

/**
 * Everything stateful: the engine, the bridges and the command-side theme
 * hookup. It renders no UI of its own, so a host can keep it mounted while the
 * visible surface comes and goes — that is what makes the stack survive a
 * close. `onDismiss` fires when esc is pressed at the root with an empty input.
 */
export function PaletteRoot({
  onDismiss,
  children,
}: {
  onDismiss?: () => void
  children: React.ReactNode
}) {
  return (
    <PaletteProvider rootPage={rootPage} onDismiss={onDismiss}>
      <PaletteBridgeProvider>
        <ThemeCommandBridge />
        {children}
      </PaletteBridgeProvider>
    </PaletteProvider>
  )
}

/**
 * The visible half: frame and page host. Mounting it is what focuses the
 * palette, so a host can mount and unmount it freely — no state lives here.
 * Must be rendered inside a `PaletteRoot`.
 */
export function PaletteSurface() {
  return (
    <PaletteFrame>
      <PageHost />
    </PaletteFrame>
  )
}

/**
 * The palette as one piece, with no opinion about what surrounds it. Hosts
 * that unmount their container (a dialog, say) should compose `PaletteRoot`
 * and `PaletteSurface` themselves instead, so the stack outlives the close.
 */
export function CommandPalette({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <PaletteRoot onDismiss={onDismiss}>
      <PaletteSurface />
    </PaletteRoot>
  )
}
