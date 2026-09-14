"use client"

import { createContext, useContext, useMemo } from "react"

import { normalizeRoles } from "../core/roles"
import type { RoleInput } from "../core/roles"

const RolesContext = createContext<ReadonlySet<string> | null>(null)

/** Nothing held, for a palette mounted without a `roles` prop at all. */
const NONE: ReadonlySet<string> = new Set()

/**
 * Publishes the roles every command's `roles` is read against, so that nothing
 * inside the palette has to be handed them — see `useCurrentRoles`.
 *
 * Whatever shape the host's auth already hands back goes in: one role, an array
 * of them, a `Set`, or nothing at all. It is normalized once, here, rather than
 * at each of the places that ask.
 *
 * Unlike `PalettePathProvider` this does not throw when it has been given
 * nothing. A palette with no path cannot answer a question it is about to be
 * asked; a palette with no roles has answered it — this user holds none — and
 * an app with no roles at all is one where every command says `["*"]` and none
 * of this costs anything. Requiring it would be ceremony for every host that
 * has no use for the feature.
 */
export function PaletteRolesProvider({
  roles,
  children,
}: {
  roles?: RoleInput
  children: React.ReactNode
}) {
  return (
    <RolesContext.Provider value={useHeldRoles(roles)}>
      {children}
    </RolesContext.Provider>
  )
}

/**
 * The roles as a set, kept stable for as long as they say the same thing.
 *
 * By content and not by identity, because `roles={["admin"]}` is a shape hosts
 * will write and it is a fresh array on every render of their shell. The path
 * gets this for free — it is a string, and React compares it by value — but a
 * set published straight to a provider would hand every consumer a new
 * reference each time, and re-render the whole palette for a fact that did not
 * move.
 *
 * Keyed on the content rather than memoized on the prop, because memoizing on
 * the prop is exactly what does not work here: the array is new each time and
 * the memo would miss every time.
 */
function useHeldRoles(input: RoleInput): ReadonlySet<string> {
  // Sorted, so the same roles in a different order are the same key. Rebuilt
  // every render rather than memoized itself: it is a handful of short strings,
  // and a memo to avoid it would need the very key it is computing.
  const key = [...normalizeRoles(input)].sort().join("\u0000")

  // `key` *is* `input`, compared by content instead of by identity — which is
  // the whole point, so listing `input` as well would undo it.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  return useMemo(() => normalizeRoles(input), [key])
}

/**
 * The roles the current user holds, as the palette was told them. What every
 * command's `roles` is answered against, and what a page of your own can read
 * to say something about who opened it. See `isAvailableTo`.
 *
 * The empty set outside a provider, and for a user who holds nothing — the same
 * answer to the same question, which is why this never throws.
 */
export function useCurrentRoles(): ReadonlySet<string> {
  return useContext(RolesContext) ?? NONE
}
