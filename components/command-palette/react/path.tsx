"use client"

import { createContext, useContext, useState } from "react"
import { createNavigation } from "next-intl/navigation"
import type {
  DomainsConfig,
  LocalePrefixMode,
  Pathnames,
  RoutingConfig,
} from "next-intl/routing"

import { normalizePath } from "../core/routes"

const PathContext = createContext<string | null>(null)

/**
 * The host's routing config — whatever `defineRouting` gave back.
 *
 * Widened off next-intl's own type rather than made generic: the palette only
 * ever asks it one question, and answering it needs no locale union.
 */
export type PaletteRouting = RoutingConfig<
  readonly string[],
  LocalePrefixMode,
  Pathnames<readonly string[]>,
  DomainsConfig<readonly string[]>
>

/**
 * Where the user is, as `routing.pathnames` names it.
 *
 * next-intl's `usePathname` is the one that answers in the right vocabulary.
 * `next/navigation`'s gives the URL — `/de/projekte/atlas` — and a rule can do
 * nothing with that: it would have to know the locale prefixes and every
 * translated spelling of every segment to get back to the route. This one
 * hands over the internal pathname, `/projects/[id]`, which is exactly what a
 * `paths` rule is written in. One rule, every locale, no second list.
 *
 * The navigation functions are built once and kept, like the store: they are
 * made from the routing config, which does not move, and rebuilding them every
 * render would hand back a new `usePathname` each time for no reason.
 */
function useRoutedPath(routing: PaletteRouting): string {
  const [{ usePathname }] = useState(() => createNavigation(routing))
  return usePathname()
}

/** The two halves below share this; the path is normalized once, here. */
function Path({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <PathContext.Provider value={normalizePath(path)}>
      {children}
    </PathContext.Provider>
  )
}

function RoutedPath({
  routing,
  children,
}: {
  routing: PaletteRouting
  children: React.ReactNode
}) {
  return <Path path={useRoutedPath(routing)}>{children}</Path>
}

/**
 * Publishes the path every command's `paths` is read against, so that nothing
 * inside the palette has to be handed it — see `useCurrentPath`.
 *
 * It comes from the router by default. `path` is the way out for a host with
 * no next-intl to ask: a plain string, worked out however it likes. Giving
 * both wins for `path`, and giving neither is a mistake worth failing on
 * rather than quietly treating everything as `/`.
 *
 * Which of the two is in use is fixed for the life of a palette in practice,
 * and swapping between them remounts what is below — they are different
 * components because a hook cannot be called conditionally.
 */
export function PalettePathProvider({
  routing,
  path,
  children,
}: {
  routing?: PaletteRouting
  path?: string
  children: React.ReactNode
}) {
  if (path !== undefined) return <Path path={path}>{children}</Path>

  if (!routing) {
    throw new Error(
      "The palette needs to know where the user is: pass `routing` (your " +
        "next-intl config, from `defineRouting`) or, failing that, `path`."
    )
  }

  return <RoutedPath routing={routing}>{children}</RoutedPath>
}

/**
 * The path the palette is being shown on, normalized — `/projects/[id]` on
 * `/de/projekte/atlas`. What every command's `paths` is answered against, and
 * what a page of your own can read to say something about where it was opened.
 * See `isAvailableOn`.
 */
export function useCurrentPath(): string {
  const path = useContext(PathContext)
  if (path === null) {
    throw new Error("useCurrentPath must be used inside a <PaletteProvider>")
  }
  return path
}
