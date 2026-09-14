/**
 * The third question about a row, after where it exists and who it is for:
 * whether the app is running on the machine it was written on.
 *
 * Not which build it is. A `next build` served from a developer's laptop is
 * still their laptop, and a `next dev` on a preview deployment is still a
 * deployment with other people looking at it — so `NODE_ENV` answers a
 * question next to this one rather than this one. The host name does answer
 * it, and it is the only fact a palette in a browser has that a deployment
 * cannot fake into being someone's desk.
 *
 * Unlike the other two rules this takes no vocabulary: the app is on a local
 * host or it is not, so the whole of a command's answer is a boolean, and the
 * default is the one that costs nothing to leave unwritten — a command with no
 * `local` is a command for everywhere the app runs.
 *
 * **Hidden is not absent.** A local-only command is still in the array the
 * host shipped, still in the bundle, and still readable by anyone who looks —
 * the same caveat `roles` carries, for the same reason. This keeps a debugging
 * row off a deployment; it is not how a secret is kept.
 */

/** Names that can only mean this machine, whatever is served from it. */
const LOOPBACK: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  // `file://` and anything else with no host at all: not a deployment either.
  "",
])

/**
 * Is this host name one of the developer's own?
 *
 *     localhost, 127.0.0.1, ::1, 0.0.0.0   the machine itself
 *     127.0.0.2, 127.0.0.1:3000            the rest of 127/8, and any port
 *     app.localhost, mac-mini.local        names that resolve to a desk
 *
 * Deliberately not the private IPv4 ranges. `10.0.4.20` is a developer's phone
 * on the office wifi about as often as it is an internal staging box that half
 * the company can reach, and a rule cannot tell the two apart. Guessing wrong
 * there puts debugging rows in front of people who are not developers, which is
 * the worse of the two ways to be wrong — the other is one prop: a host testing
 * over the LAN passes `local` and says so outright.
 */
export function isLocalHost(hostname: string): boolean {
  const name = hostOf(hostname)

  if (LOOPBACK.has(name)) return true
  // The whole of 127/8 is this machine, not just the .1 everyone types.
  if (/^127(\.\d{1,3}){3}$/.test(name)) return true

  // `.localhost` is reserved for exactly this, and `.local` is mDNS — the name
  // a machine answers to on a desk, which no deployment is given.
  return name.endsWith(".localhost") || name.endsWith(".local")
}

/**
 * The host on its own. `location.hostname` is already this, but a `location.host`
 * or a hand-written string carries a port and an IPv6 address wears brackets,
 * and both are the kind of thing a caller hands over without thinking about it.
 */
function hostOf(input: string): string {
  const name = input.trim().toLowerCase()

  // `[::1]:3000` — bracketed, so the colons inside are the address's own.
  const bracketed = /^\[([^\]]*)\]/.exec(name)
  if (bracketed) return bracketed[1] ?? ""

  // One colon is a port; more than one is a bare IPv6 address, which has no
  // room for a port precisely because it would be unreadable.
  const parts = name.split(":")
  return (parts.length === 2 ? parts[0] : name) ?? ""
}

/** Is a command with this `local` flag available where the app is running? */
export function isAvailableLocally(
  local: boolean | undefined,
  isLocal: boolean
): boolean {
  return isLocal || !local
}

/** The rows of a list this environment can show, in the order they came. */
export function availableLocally<T extends { local?: boolean }>(
  items: readonly T[],
  isLocal: boolean
): T[] {
  return items.filter((item) => isAvailableLocally(item.local, isLocal))
}
