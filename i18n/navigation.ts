import { createNavigation } from "next-intl/navigation"

import { routing } from "./routing"

/**
 * The navigation APIs, bound to the routing config — the localized twins of
 * the ones in `next/navigation`.
 *
 * The difference that matters here: these speak internal pathnames. `Link`
 * takes `/projects` and renders `/projekte` for a German reader, and
 * `usePathname()` gives `/projects/[id]` back on `/de/projekte/atlas`. So the
 * whole app — the nav, the router bridge, the palette's `paths` rules — is
 * written in one vocabulary, and localizing a URL is a change to
 * `routing.pathnames` and nowhere else.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
