"use client"

import { Activity } from "react"
import type { ComponentType } from "react"

import { PageProvider, usePaletteState } from "@/lib/palette/react"

/**
 * Renders the whole stack, with everything below the top hidden.
 *
 * Hidden, not unmounted: `Activity` keeps a page's React state, refs and DOM
 * exactly as the user left them, so a page is free to hold whatever it likes
 * however it likes — coming back to it is not a rebuild. What `Activity` does
 * tear down is effects, which is what we want: a page that isn't on top stops
 * publishing its key handler to the frame and stops holding focus.
 *
 * Scroll offsets come back too, with nothing to wire up. `Activity` hides with
 * `display: none`, and while a box has no layout its `scrollTop` reads 0 — but
 * the browser holds the offset and restores it along with the box. Verified in
 * Chrome and Safari; the reading of 0 while hidden is what makes this look like
 * data loss when it isn't.
 */
export function PageHost() {
  const state = usePaletteState()
  const topId = state.stack[state.stack.length - 1].instanceId

  return state.stack.map((instance) => {
    const Page = instance.page.component as ComponentType

    return (
      <Activity
        key={instance.instanceId}
        mode={instance.instanceId === topId ? "visible" : "hidden"}
      >
        <PageProvider instanceId={instance.instanceId}>
          <Page />
        </PageProvider>
      </Activity>
    )
  })
}
