"use client"

import type { ComponentType } from "react"

import { PageProvider, usePaletteState } from "@/lib/palette/react"

/**
 * Renders the top of the stack. Lower pages are unmounted, which is safe
 * because their state lives in the store, not in their components — coming
 * back to a page restores exactly what the user left there.
 */
export function PageHost() {
  const state = usePaletteState()
  const instance = state.stack[state.stack.length - 1]
  const Page = instance.page.component as ComponentType

  return (
    <PageProvider key={instance.instanceId} instanceId={instance.instanceId}>
      <Page />
    </PageProvider>
  )
}
