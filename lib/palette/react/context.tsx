"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"

import { createPaletteStore } from "../store"
import type { PaletteStore } from "../store"
import type { PageTarget, PaletteState } from "../types"
import { selectView } from "../view"
import type { PaletteView } from "../view"

const StoreContext = createContext<PaletteStore | null>(null)
const InstanceContext = createContext<string | null>(null)

export function PaletteProvider({
  rootPage,
  onDismiss,
  children,
}: {
  rootPage: PageTarget
  /** Called when esc is pressed at the root with an empty input. */
  onDismiss?: () => void
  children: React.ReactNode
}) {
  const [store] = useState(() => createPaletteStore({ rootPage }))

  // Swapped on the store rather than captured at creation, so a changing
  // callback never rebuilds the stack.
  useEffect(() => {
    store.setOnDismiss(onDismiss)
  }, [store, onDismiss])

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
 * state even when it isn't the top of the stack.
 */
export function PageProvider({
  instanceId,
  children,
}: {
  instanceId: string
  children: React.ReactNode
}) {
  const store = usePaletteStore()

  useEffect(() => {
    // Runs the page's optional `load`, once per instance.
    store.loadInstance(instanceId)
  }, [store, instanceId])

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
