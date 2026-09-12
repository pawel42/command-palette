"use client"

import { Activity } from "react"

import { isListPage, resolveFooter } from "../core"
import type { AnyPage, RenderPage } from "../core"
import { PageProvider, useInstanceId, usePaletteStore } from "../react"
import { usePaletteState } from "../react"

import { usePublishFooter } from "./internal/bridge"
import { ListPageView } from "./list-page"

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
/**
 * Publishes the footer a page declared on its definition. It renders nothing,
 * and it sits inside the `Activity` above so it stops publishing exactly when
 * the page stops being the top of the stack — the same teardown that takes the
 * page's key handler with it.
 */
function ConfigFooter({ page }: { page: AnyPage }) {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  // Subscribed, so a footer built from the query or the props is rebuilt.
  usePaletteState()

  usePublishFooter(
    "config",
    resolveFooter(page.footer, store.contextFor(instanceId))
  )

  return null
}

/**
 * The body of a page that wrote its own: `render` is mounted as a component —
 * never called — so its hooks are its own, its state is kept by the `Activity`
 * above, and the footer it publishes leaves when it does. The context goes in
 * as props, which is why a page body can be a plain function of it; anything
 * nested deeper reaches the same context through the hooks.
 */
function RenderedPage({ page }: { page: RenderPage<unknown, unknown> }) {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  // Subscribed, so a body built from the query or the props is rebuilt.
  usePaletteState()

  const ctx = store.contextFor(instanceId)
  if (!ctx) return null

  const Body = page.render
  return <Body {...ctx} />
}

/** Whichever kind of page this is — the palette's list, or the page's own. */
function PageBody({ page }: { page: AnyPage }) {
  return isListPage(page) ? (
    <ListPageView page={page} />
  ) : (
    <RenderedPage page={page as RenderPage<unknown, unknown>} />
  )
}

export function PageHost() {
  const state = usePaletteState()
  const topId = state.stack[state.stack.length - 1].instanceId

  return state.stack.map((instance) => (
    <Activity
      key={instance.instanceId}
      mode={instance.instanceId === topId ? "visible" : "hidden"}
    >
      <PageProvider instanceId={instance.instanceId}>
        <ConfigFooter page={instance.page} />
        <PageBody page={instance.page} />
      </PageProvider>
    </Activity>
  ))
}
