import type { RoleInput, RolePattern } from "./types"

/**
 * The empty set, shared. Handed back for every way of holding no roles, so a
 * signed-out palette re-renders on identity exactly never — the React half
 * memoizes on this, the way `async.ts` keeps one `IDLE` snapshot.
 */
const NONE: ReadonlySet<string> = new Set()

/**
 * Whatever the host had, as a set of role names.
 *
 * A bare string is one role and not a list of characters, which is the whole
 * reason this exists: `roles={session.user.role}` is the commonest shape there
 * is, and `new Set("admin")` would quietly hold five letters.
 *
 * A `Set` is handed back as it came, not copied — so it must not be mutated
 * afterwards. Nothing here would notice, and neither would React.
 */
export function normalizeRoles(input: RoleInput): ReadonlySet<string> {
  if (input === null || input === undefined) return NONE
  if (typeof input === "string") return input ? new Set([input]) : NONE
  if (input instanceof Set) return input.size ? input : NONE

  const held = new Set(input)
  return held.size ? held : NONE
}

/** Does one rule — with its `!` already stripped — cover this user? */
function covers(rule: string, held: ReadonlySet<string>): boolean {
  return rule === "*" || held.has(rule)
}

/**
 * Is a command with these rules available to a user holding these roles?
 *
 * Deny by default, exactly as `paths` is: a command is for nobody until a rule
 * says otherwise, which is why `"*"` is written out rather than implied.
 *
 *     ["*"]                     everyone, signed out included
 *     ["admin", "support"]      either one
 *     ["*", "!viewer"]          everyone except viewers
 *     []                        nobody at all
 *
 * What is *not* `paths`' rule is the tiebreak, and the difference is the
 * subject rather than a change of mind. A user is on one path, so "the last
 * rule that covers it" is a total order over rules that genuinely contain one
 * another — `/admin/*` really does hold `/admin/users`, and something has to
 * break that tie. A user holds a *set* of roles, and the rules covering them
 * contain nothing at all: "last" would no longer settle an overlap the syntax
 * created, it would invent a priority out of the order two lines happen to sit
 * in. For a user holding both admin and viewer, `["admin", "!viewer"]` and
 * `["!viewer", "admin"]` would mean opposite things, and neither spelling is
 * the obvious one — so half the time a reordered pair of lines would hand a
 * viewer a row, which is the wrong direction to fail in.
 *
 * So a deny wins wherever it sits: `["*", "!viewer"]` and `["!viewer", "*"]`
 * are one rule written twice, and the list stays the set of names it looks
 * like. A host that wants admin to outrank viewer writes `["admin"]` and does
 * not mention viewer — precedence between roles is a hierarchy, and there
 * isn't one here.
 *
 * This is what the palette draws, not what the server allows. A row that is
 * not here is not *offered*; it is not thereby forbidden. Authorization is the
 * host's, on the other side of the network.
 */
export function isAvailableTo(
  roles: readonly RolePattern[],
  held: ReadonlySet<string>
): boolean {
  let granted = false

  for (const pattern of roles) {
    if (pattern.startsWith("!")) {
      // A deny is a deny, wherever it sits and whatever else the user holds.
      if (covers(pattern.slice(1), held)) return false
    } else if (covers(pattern, held)) {
      granted = true
    }
  }

  return granted
}

/** The rows of a list this user can see, in the order they came. */
export function availableTo<T extends { roles: readonly RolePattern[] }>(
  items: readonly T[],
  held: ReadonlySet<string>
): T[] {
  return items.filter((item) => isAvailableTo(item.roles, held))
}
