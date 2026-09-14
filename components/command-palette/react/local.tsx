"use client"

import { createContext, useContext, useSyncExternalStore } from "react"

import { isLocalHost } from "../core/local"

const LocalContext = createContext<boolean | null>(null)

/** The host name never moves while a page is open, so there is nothing to watch. */
const NEVER = () => () => {}

const here = () => isLocalHost(window.location.hostname)

/**
 * What the server renders. It has no host name to read — the one the request
 * came in on is not the one the browser typed, behind a proxy — so it answers
 * the way the rule's default does: not local.
 *
 * That is also why this is `useSyncExternalStore` rather than a plain read.
 * The server's answer and the browser's may differ, and this is the hook that
 * is built for exactly that: React hydrates with the first, then re-renders
 * with the second. Reading `location` during render would instead hand React
 * two different trees for the same HTML and call it a mismatch. Nothing is
 * seen to move either way — the palette is shut until somebody presses ⌘K.
 */
const NOT_ON_THE_SERVER = () => false

function useLocalHost(): boolean {
  return useSyncExternalStore(NEVER, here, NOT_ON_THE_SERVER)
}

/**
 * Publishes whether the app is running on the developer's own machine, so
 * nothing inside the palette has to be handed it — see `useIsLocal`.
 *
 * A host that passes nothing gets the host name's answer, which is the answer
 * in almost every case and is why this provider's prop is optional. Saying it
 * outright is for the cases the host name cannot settle: a dev server reached
 * over the LAN from a phone, a tunnel with a public URL on the front of it, a
 * screenshot run that wants the rows gone.
 */
export function PaletteLocalProvider({
  local,
  children,
}: {
  local?: boolean
  children: React.ReactNode
}) {
  const runningLocally = useLocalHost()

  return (
    <LocalContext.Provider value={local ?? runningLocally}>
      {children}
    </LocalContext.Provider>
  )
}

/**
 * Whether the app is running locally. What every command's `local` is answered
 * against, and what a page of your own can read to show something it would not
 * show on a deployment. See `isAvailableLocally`.
 *
 * Outside a provider it is the host name's own answer — the same one the
 * provider would have defaulted to — so a panel off to one side never
 * disagrees with the rows.
 */
export function useIsLocal(): boolean {
  const told = useContext(LocalContext)
  const runningLocally = useLocalHost()

  return told ?? runningLocally
}
