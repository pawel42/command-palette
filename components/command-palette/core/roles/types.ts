/**
 * Who a command is for, written as rules over the app's own roles.
 *
 * The vocabulary is the host's role list, not `string`: a command names the
 * roles the app already has, and every rule anywhere in the app is checked
 * against them. A typo in `"admn"` is then a compile error rather than a
 * command that silently never appears — the same bargain `paths` strikes with
 * the router's pathnames, for the same reason.
 */

declare global {
  /**
   * The app's roles. Empty here — the host declares them, once, anywhere in its
   * own code, off whatever list it already keeps:
   *
   *     export const ROLES = ["admin", "support", "member", "viewer"] as const
   *
   *     declare global {
   *       interface PaletteRoles {
   *         role: (typeof ROLES)[number]
   *       }
   *     }
   *
   * Derived rather than written out, so there is no second list to drift: the
   * roles a rule can name are the roles there are.
   *
   * Declared globally rather than as a module augmentation for the reason given
   * in `routes/types.ts`: there is no import specifier to get wrong, and
   * getting one wrong would fail by silently going back to unchecked strings.
   *
   * Until a host declares it, `roles` takes any string and nothing is checked.
   * The folder still works; it just has no vocabulary to check against.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the host fills this in
  interface PaletteRoles {}
}

/** Every role the host declared, or `string` while it has declared none. */
export type AppRole = PaletteRoles extends { role: infer R extends string }
  ? R
  : string

/**
 * One rule in a command's `roles`.
 *
 *   "admin"           anyone holding that role
 *   "*"               everyone, signed out included
 *   "!viewer"         anyone but them, whatever else they hold
 *
 * There is no `"!*"`. A deny wins wherever it sits — see `isAvailableTo` — so
 * it would cover everybody and strike out every other rule in the list. An
 * empty array already says "nobody", and says it without looking like it says
 * something else.
 *
 * There is no wildcard below `"*"` either: a role is one token, so there is no
 * subtree for a `*` to stand in for and nothing for `"admin/*"` to mean.
 */
export type RolePattern<R extends string = AppRole> = R | "*" | `!${R}`

/**
 * What a host can hand over as the roles the current user holds.
 *
 * Deliberately wide, because this is the one part of the palette that has to
 * meet an app where it already is: a session with a single `role` string, a
 * token with an array of them, a `Set` built once and kept. All three are the
 * same fact, and normalizing here is cheaper than making every host reshape it
 * on the way in.
 *
 * `null` and `undefined` are the empty set, not an error — that is a user who
 * is signed out, or a session that has not landed yet, and both of those hold
 * no roles. There is no third "unknown" state, because nothing could be drawn
 * differently for it: a row is either something this user can see or it is not.
 */
export type RoleInput =
  string | readonly string[] | ReadonlySet<string> | null | undefined
