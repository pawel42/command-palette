import type { RolePattern } from "@/components/command-palette"

/**
 * The app's roles: one list, in one place, the way `i18n/routing.ts` keeps one
 * list of pathnames. Everything reads it — the role switcher in the shell, and
 * every `roles` rule on every command.
 *
 * The last is the point. The palette's vocabulary is this union, so a command
 * says who it is for in terms of *these* roles and `"admn"` is a compile error
 * rather than a command that quietly never appears. There is no second list to
 * keep in step: the roles a command can name are the roles the app has.
 *
 * A real app would take these from wherever it already keeps them — a session
 * type, a database enum, an auth provider's claims. The requirement is only
 * that they are derived from one place rather than written out twice.
 */
export const ROLES = ["admin", "support", "member", "viewer"] as const

export type AppRole = (typeof ROLES)[number]

/**
 * Hands the palette the vocabulary above, the same way and for the same reason
 * `PaletteRoutes` is handed the pathnames. Declared once, anywhere in the app;
 * every `roles` in every file is checked against it from here on.
 */
declare global {
  interface PaletteRoles {
    role: AppRole
  }
}

/**
 * The one rule that means "whoever is looking". Spelled out rather than
 * implied: a command is for nobody until its `roles` says otherwise, so the
 * commands that really are for everyone say so in as many words.
 *
 * A name for the one rule, not a second way to spell it — `EVERYWHERE` in
 * `paths.ts` is the same idea, and rows built inside a page are mostly both.
 * The page is somewhere the user has already been let in, and it was a command
 * answerable to the path *and* to the user that let them in.
 */
export const ANYONE = ["*"] as const satisfies readonly RolePattern[]

/**
 * What the demo starts as. A member sees everything that is not admin work —
 * which makes the admin rows the visible half of the feature, and switching to
 * `viewer` the way to watch a row and its shortcut go at once.
 */
export const DEFAULT_ROLE: AppRole = "member"
