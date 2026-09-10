"use client"

import { PaletteProvider } from "@/lib/palette/react"

import { PaletteBridgeProvider } from "./bridge"
import { rootPage } from "./commands"
import { PaletteFrame } from "./frame"
import { PageHost } from "./page-host"
import { ThemeCommandBridge } from "./theme-bridge"

/**
 * The palette itself: engine, frame and page host wired together, with no
 * opinion about what surrounds it. `onDismiss` fires when esc is pressed at
 * the root with an empty input — that is where a host closes its dialog.
 */
export function CommandPalette({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <PaletteProvider rootPage={rootPage} onDismiss={onDismiss}>
      <PaletteBridgeProvider>
        <ThemeCommandBridge />
        <PaletteFrame>
          <PageHost />
        </PaletteFrame>
      </PaletteBridgeProvider>
    </PaletteProvider>
  )
}
