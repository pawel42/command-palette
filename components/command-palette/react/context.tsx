"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"

import type { Command } from "../core/command"
import type { PageTarget } from "../core/page"
import { normalizePath } from "../core/routes"
import { selectView } from "../core/stack"
import type { PaletteState, PaletteView } from "../core/stack"
import { createPaletteStore } from "../core/store"
import type { PaletteStore } from "../core/store"

const StoreContext = createContext<PaletteStore | null>(null)
const InstanceContext = createContext<string | null>(null)
const PathContext = createContext<string | null>(null)

export function PaletteProvider({
  rootPage,
  path,
  onDismiss,
  onCommand,
  revealMs,
  children,
}: {
  rootPage: PageTarget
  /**
   * Where the user is, as the router sees it — `usePathname()` in Next, and
   * whatever the host's own router calls the same thing. Every command says
   * which paths it exists on, and this is what those are read against.
   *
   * A prop rather than anything the palette works out for itself: it has no
   * router, and taking one would be the end of the folder being copyable.
   * Unlike the root config this is read on every render, because it moves —
   * the palette is mounted above the router and outlives any one route.
   */
  path: string
  /** Called when esc is pressed at the root with an empty input. */
  onDismiss?: () => void
  /** Called with every command the palette runs. */
  onCommand?: (command: Command) => void
  /** How long work runs before the palette shows a bar — see `REVEAL_MS`. */
  revealMs?: number
  children: React.ReactNode
}) {
  // Read once, like `rootPage`: both describe the store being built, not the
  // render doing it.
  const [store] = useState(() => createPaletteStore({ rootPage, revealMs }))

  // Swapped on the store rather than captured at creation, so a changing
  // callback never rebuilds the stack.
  useEffect(() => {
    store.setOnDismiss(onDismiss)
  }, [store, onDismiss])

  useEffect(() => {
    store.setOnCommand(onCommand)
  }, [store, onCommand])

  // Normalized here, once, so nothing downstream has to wonder whether it is
  // holding a trailing slash or a query string.
  const here = normalizePath(path)

  return (
    <StoreContext.Provider value={store}>
      <PathContext.Provider value={here}>{children}</PathContext.Provider>
    </StoreContext.Provider>
  )
}

/**
 * The path the palette is being shown on, normalized. What every command's
 * `paths` is answered against — see `isAvailableOn`.
 */
export function useCurrentPath(): string {
  const path = useContext(PathContext)
  if (path === null) {
    throw new Error("useCurrentPath must be used inside a <PaletteProvider>")
  }
  return path
}

export function usePaletteStore(): PaletteStore {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error("usePaletteStore must be used inside a <PaletteProvider>")
  }
  return store
}

/**
 * The raw state object. `getSnapshot` must return a stable reference, which is
 * why the store hands back the state itself and every derived shape is built
 * with `useMemo` on top of it.
 */
export function usePaletteState(): PaletteState {
  const store = usePaletteStore()
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

export function usePaletteView(): PaletteView {
  const state = usePaletteState()
  return useMemo(() => selectView(state), [state])
}

/**
 * Binds everything below it to one instance, so a page component reads its own
 * query and selection even when it isn't the top of the stack.
 */
export function PageProvider({
  instanceId,
  children,
}: {
  instanceId: string
  children: React.ReactNode
}) {
  return (
    <InstanceContext.Provider value={instanceId}>
      {children}
    </InstanceContext.Provider>
  )
}

/** The instance a component belongs to; the top of the stack by default. */
export function useInstanceId(): string {
  const fromContext = useContext(InstanceContext)
  const state = usePaletteState()

  return fromContext ?? state.stack[state.stack.length - 1].instanceId
}
