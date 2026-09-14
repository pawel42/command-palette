/**
 * Where a command is available, written as patterns over the app's own
 * pathnames.
 *
 * The vocabulary is the host's routing config, not `string`: a command names
 * the routes the router already knows, and every rule anywhere in the app is
 * checked against them. A typo in `"/setttings"` is then a compile error
 * rather than a command that silently never appears.
 */

declare global {
  /**
   * The app's pathnames. Empty here — the host declares them, once, anywhere
   * in its own code, off the routing config it already keeps:
   *
   *     declare global {
   *       interface PaletteRoutes {
   *         path: keyof typeof routing.pathnames
   *       }
   *     }
   *
   * Derived rather than written out, so there is no second list to drift: the
   * routes a rule can name are the routes there are.
   *
   * Declared globally rather than as a module augmentation because there is no
   * import specifier to get wrong: augmenting a re-exporting barrel silently
   * declares a second interface instead of merging into this one, and the
   * failure mode is unchecked strings rather than an error.
   *
   * Until a host declares it, `paths` takes any string and nothing is checked.
   * The folder still works; it just has no vocabulary to check against.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the host fills this in
  interface PaletteRoutes {}
}

/** Every pathname the host declared, or `string` while it has declared none. */
export type AppPath = PaletteRoutes extends { path: infer P extends string }
  ? P
  : string

/** `"/admin/users"` -> `["admin", "users"]`, `"/"` -> `[]`. */
type Segments<P extends string> = P extends "/"
  ? []
  : P extends `/${infer Rest}`
    ? Split<Rest>
    : never

type Split<S extends string> = S extends `${infer Head}/${infer Tail}`
  ? [Head, ...Split<Tail>]
  : [S]

/**
 * Every place a `/*` can be hung: the root, each ancestor of a declared path,
 * and the path itself. `"/admin/users"` gives `""`, `"/admin"`, `"/admin/users"`.
 */
type Prefixes<
  S extends readonly string[],
  Acc extends string = "",
> = S extends readonly [
  infer Head extends string,
  ...infer Rest extends readonly string[],
]
  ? Acc | Prefixes<Rest, `${Acc}/${Head}`>
  : Acc

/** A subtree rule: the base and everything under it. `"/*"` is every path. */
type Subtree<P extends string> = `${Prefixes<Segments<P>>}/*`

/** One path, or one subtree. */
type Covered<P extends string> = P | Subtree<P>

/**
 * One rule in a command's `paths`.
 *
 *   "/admin"          exactly that page
 *   "/admin/*"        that page and everything under it
 *   "/*"              every path there is
 *   "!/admin"         and the same three, negated
 *
 * A dynamic segment is written the way the route is: `"/projects/[id]"` is a
 * rule, and `/projects/42` is a path it covers.
 */
export type PathPattern<P extends string = AppPath> =
  Covered<P> | `!${Covered<P>}`
