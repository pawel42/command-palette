import type { AppPathname } from "@/i18n/routing"

/**
 * What the nav bar links to, in order — the dynamic route is reached through
 * a row rather than a link.
 *
 * A list of routes, not a routing config: the routes themselves are declared
 * once in `i18n/routing.ts`, and `satisfies` is what ties this to them. Add a
 * pathname there and the nav is free to ignore it; misspell one here and it
 * does not compile.
 */
export const NAV = [
  "/",
  "/projects",
  "/admin",
  "/admin/users",
  "/settings",
] as const satisfies readonly Exclude<AppPathname, `${string}[${string}`>[]

export type NavPath = (typeof NAV)[number]

/**
 * What the nav calls each one. Labels, not routes — this demo localizes its
 * URLs and not its copy, so there is one set of them.
 */
export const NAV_LABELS: Record<NavPath, string> = {
  "/": "Home",
  "/projects": "Projects",
  "/admin": "Admin",
  "/admin/users": "Users",
  "/settings": "Settings",
}
