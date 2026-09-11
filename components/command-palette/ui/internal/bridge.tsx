"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react"

import { NO_FOOTER } from "../../core"
import type { PageFooter } from "../../core"

/**
 * Connects the frame's input and footer to whichever page is on top, without
 * either side importing the other.
 *
 * Two kinds of channel, because of how each is read:
 *  - what is only read inside an event handler — the key handler, and the
 *    footer's actions at the moment one runs — lives behind a getter/setter
 *    pair rather than in React state;
 *  - what is read during render — the aria ids, and what the footer *draws* —
 *    goes through a small external store the frame subscribes to.
 *
 * The footer uses both at once, and that is the whole trick: see `setFooter`.
 */

type KeyHandler = (event: React.KeyboardEvent) => void

type Aria = { activeOptionId?: string; listId?: string }

/** Which half of the API published the footer; the page's half wins. */
type FooterSource = "config" | "page"

type Bridge = {
  getKeyHandler: () => KeyHandler | null
  setKeyHandler: (handler: KeyHandler | null) => void
  getAria: () => Aria
  setAria: (aria: Aria) => void
  /** The live footer, closures and all — for running an action. */
  getFooter: () => PageFooter
  /** The footer as last drawn; identity only moves when the drawing would. */
  getRenderedFooter: () => PageFooter
  setFooter: (source: FooterSource, footer: PageFooter | null) => void
  subscribe: (listener: () => void) => () => void
}

/**
 * What the footer *looks* like, as a string. Icons and handlers are left out
 * on purpose: `run` is a fresh closure on every render of the page, so
 * including it would defeat the guard entirely and put the frame in a render
 * loop. Which is exactly why an action must be looked up through `getFooter`
 * at the moment it runs, never taken from the snapshot it was drawn from.
 */
function footerSignature(footer: PageFooter): string {
  const actions = (footer.actions ?? []).map((action) =>
    [
      action.id,
      action.title,
      action.subtitle ?? "",
      action.section ?? "",
      action.disabled ? "off" : "",
      (action.shortcut ?? []).join("+"),
      "page" in action && action.page ? "page" : "",
    ].join("|")
  )

  const hints = (footer.hints ?? []).map(
    (hint) => `${hint.keys.join("+")}|${hint.label}`
  )

  return `${actions.join("\n")}\n--\n${hints.join("\n")}`
}

function createBridge(): Bridge {
  let aria: Aria = {}
  let keyHandler: KeyHandler | null = null
  /** The newest footer from each half of the API. */
  const published: Record<FooterSource, PageFooter | null> = {
    config: null,
    page: null,
  }
  /** The one the frame last rendered, and the signature that decided it. */
  let rendered: PageFooter = NO_FOOTER
  let signature = footerSignature(NO_FOOTER)

  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }

  /** Whoever declares the footer declares all of it — the page's half wins. */
  const live = () => published.page ?? published.config ?? NO_FOOTER

  return {
    getKeyHandler: () => keyHandler,

    setKeyHandler: (handler) => {
      keyHandler = handler
    },

    getFooter: live,

    getRenderedFooter: () => rendered,

    setFooter: (source, footer) => {
      published[source] = footer

      // Always taken, so a handler never runs a stale closure — but only
      // handed to React when the footer would draw differently. A page builds
      // its actions inline, so without this guard every render of the page
      // would re-render the frame, which re-renders the page.
      const next = live()
      const nextSignature = footerSignature(next)
      if (nextSignature === signature) return

      signature = nextSignature
      rendered = next
      notify()
    },

    getAria: () => aria,

    setAria: (next) => {
      if (
        next.activeOptionId === aria.activeOptionId &&
        next.listId === aria.listId
      ) {
        return
      }
      aria = next
      notify()
    },

    subscribe: (listener) => {
      listeners.add(listener)

      // Caught up the moment it arrives, because the first publish is always
      // missed: the page publishes from an effect of its own, the frame
      // subscribes from one of its own, and a child's effects run first — so
      // the footer of a freshly shown palette is announced to an empty room.
      // React compares snapshots and drops this if nothing moved.
      listener()

      return () => listeners.delete(listener)
    },
  }
}

const BridgeContext = createContext<Bridge | null>(null)

export function PaletteBridgeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [bridge] = useState(createBridge)

  return (
    <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
  )
}

function useBridge(): Bridge {
  const bridge = useContext(BridgeContext)
  if (!bridge) {
    throw new Error("Palette bridge is missing a <PaletteBridgeProvider>")
  }
  return bridge
}

/** Frame side: the handler to call on key events, plus the ids to render. */
export function useFrameBridge() {
  const bridge = useBridge()
  const aria = useSyncExternalStore(
    bridge.subscribe,
    bridge.getAria,
    bridge.getAria
  )

  return { getKeyHandler: bridge.getKeyHandler, ...aria }
}

/**
 * Frame side: the page's footer. What to draw comes from the subscribed
 * snapshot; `getFooter` is what an action must be looked up in before it runs,
 * because the snapshot's closures are as old as its signature.
 */
export function useFrameFooter() {
  const bridge = useBridge()
  const footer = useSyncExternalStore(
    bridge.subscribe,
    bridge.getRenderedFooter,
    bridge.getRenderedFooter
  )

  return { footer, getFooter: bridge.getFooter }
}

/**
 * Page side: publish a footer. The effect has no dependency array for the
 * same reason the key handler's doesn't — the actions are fresh closures every
 * render, and the bridge's own guard decides when that is worth a re-render.
 *
 * Teardown is what keeps it honest: `Activity` unmounts the effects of a page
 * that is no longer on top, so a page's footer leaves with it.
 */
export function usePublishFooter(
  source: FooterSource,
  footer: PageFooter | null
) {
  const bridge = useBridge()

  useEffect(() => {
    bridge.setFooter(source, footer)
    return () => bridge.setFooter(source, null)
  })
}

/** Page side: publish this page's keyboard handling and aria ids. */
export function usePublishBridge({
  onKeyDown,
  activeOptionId,
  listId,
}: {
  onKeyDown?: KeyHandler
  activeOptionId?: string
  listId?: string
}) {
  const bridge = useBridge()

  // No dependency array on purpose: the handler is a fresh closure every
  // render, and handing it over is cheap.
  useEffect(() => {
    bridge.setKeyHandler(onKeyDown ?? null)
    return () => bridge.setKeyHandler(null)
  })

  useEffect(() => {
    bridge.setAria({ activeOptionId, listId })
    return () => bridge.setAria({})
  }, [bridge, activeOptionId, listId])
}
