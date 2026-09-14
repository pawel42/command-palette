import { defineRouting } from "next-intl/routing"

/**
 * The app's routing config: every pathname there is, and what each one is
 * called in each locale. One list, in one place, because everything reads it —
 * the proxy that resolves an incoming URL, the `Link`s in the nav, and every
 * `paths` rule on every command.
 *
 * The last is the point. The palette's vocabulary is `keyof pathnames`, so a
 * command says where it exists in terms of *these* routes and `"/setttings"`
 * is a compile error rather than a command that quietly never appears. There
 * is no second list to keep in step: the routes a command can name are the
 * routes the router knows about, by construction.
 *
 * The keys are the internal pathnames — the folders under `app/[locale]/`, and
 * what `usePathname()` gives back whatever locale the user is in. The values
 * are what the URL says. `/projekte/atlas` is `/projects/[id]` in here, which
 * is why a rule never has to be written twice.
 */
export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",

  // `as-needed`, so English keeps the bare URLs — `/admin`, not `/en/admin`.
  // German is prefixed, which is what makes a locale visible in the demo.
  localePrefix: "as-needed",

  pathnames: {
    "/": "/",
    "/projects": { en: "/projects", de: "/projekte" },
    "/projects/[id]": { en: "/projects/[id]", de: "/projekte/[id]" },
    "/admin": { en: "/admin", de: "/verwaltung" },
    "/admin/users": { en: "/admin/users", de: "/verwaltung/benutzer" },
    "/settings": { en: "/settings", de: "/einstellungen" },
  },
})

/** Every route the app has, as the router names it internally. */
export type AppPathname = keyof typeof routing.pathnames

export type AppLocale = (typeof routing.locales)[number]

/**
 * Hands the palette the vocabulary above — derived, not written out, so the
 * two cannot drift. Declared once, anywhere in the app; every `paths` in every
 * file is checked against it from here on.
 *
 * Global rather than a module augmentation on purpose: there is no import
 * specifier to get subtly wrong, and getting one wrong would fail by silently
 * going back to unchecked strings.
 */
declare global {
  interface PaletteRoutes {
    path: AppPathname
  }
}
