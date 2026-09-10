"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react"

/**
 * Connects the frame's input to whichever page is on top, without either side
 * importing the other.
 *
 * Two channels, because of how each is read:
 *  - the key handler is only read inside an event handler, so it lives behind
 *    a getter/setter pair rather than in React state;
 *  - the aria ids are read during render, so they go through a small external
 *    store the frame subscribes to.
 */

type KeyHandler = (event: React.KeyboardEvent) => void

type Aria = { activeOptionId?: string; listId?: string }

type Bridge = {
  getKeyHandler: () => KeyHandler | null
  setKeyHandler: (handler: KeyHandler | null) => void
  getAria: () => Aria
  setAria: (aria: Aria) => void
  subscribe: (listener: () => void) => () => void
}

function createBridge(): Bridge {
  let aria: Aria = {}
  let keyHandler: KeyHandler | null = null
  const listeners = new Set<() => void>()

  return {
    getKeyHandler: () => keyHandler,

    setKeyHandler: (handler) => {
      keyHandler = handler
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
      for (const listener of listeners) listener()
    },

    subscribe: (listener) => {
      listeners.add(listener)
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
