"use client"

import { PaletteProvider } from "@/lib/palette/react"

import { logActivity } from "./activity"
import { PaletteBridgeProvider } from "./bridge"
import { rootPage } from "./commands"
import { PaletteFrame } from "./frame"
import { PageHost } from "./page-host"
import { ThemeCommandBridge } from "./theme-bridge"

/**
 * The whole palette: engine, frame and page host wired together. There is no
 * dialog around it on purpose — this is the component, rendered inline.
 */
export function CommandPalette() {
  return (
    <PaletteProvider
      rootPage={rootPage}
      onDismiss={() => logActivity("esc at the root — nothing left to close")}
    >
      <PaletteBridgeProvider>
        <ThemeCommandBridge />
        <PaletteFrame>
          <PageHost />
        </PaletteFrame>
      </PaletteBridgeProvider>
    </PaletteProvider>
  )
}
