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
import { selectView } from "../core/stack"
import type { PaletteState, PaletteView } from "../core/stack"
import { createPaletteStore } from "../core/store"
import type { PaletteStore } from "../core/store"

const StoreContext = createContext<PaletteStore | null>(null)
const InstanceContext = createContext<string | null>(null)

export function PaletteProvider({
  rootPage,
  onDismiss,
  onCommand,
  revealMs,
  children,
}: {
  rootPage: PageTarget
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

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
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
