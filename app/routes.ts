/**
 * The app's routing config: every pathname there is, and what the nav calls
 * it. One list, in one place, because two things read it — the links in the
 * shell, and every `paths` rule on every command.
 *
 * The second is the point. A command says where it exists in terms of *these*
 * pathnames, so `"/setttings"` is a compile error rather than a command that
 * quietly never appears anywhere.
 */
export const ROUTES = {
  "/": "Home",
  "/projects": "Projects",
  "/projects/[id]": "Project",
  "/admin": "Admin",
  "/admin/users": "Users",
  "/settings": "Settings",
} as const

export type AppPath = keyof typeof ROUTES

/**
 * Hands the palette the vocabulary above. Declared once, anywhere in the app;
 * every `paths` in every file is checked against it from here on.
 *
 * Global rather than a module augmentation on purpose: there is no import
 * specifier to get subtly wrong, and getting one wrong would fail by silently
 * going back to unchecked strings.
 */
declare global {
  interface PaletteRoutes {
    path: AppPath
  }
}

/** What the nav bar links to — the dynamic route is reached through a row. */
export const NAV = [
  "/",
  "/projects",
  "/admin",
  "/admin/users",
  "/settings",
] as const satisfies readonly Exclude<AppPath, `${string}[${string}`>[]
