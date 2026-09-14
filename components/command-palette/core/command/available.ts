import { availableLocally } from "../local"
import { availableTo } from "../roles"
import type { RolePattern } from "../roles"
import { availableOn } from "../routes"
import type { PathPattern } from "../routes"

/** The three facts a row is answered against — see `availableHere`. */
export type Audience = {
  /** Where the user is, normalized — see `useCurrentPath`. */
  path: string
  /** Which roles they hold — see `useCurrentRoles`. */
  roles: ReadonlySet<string>
  /** Whether the app is running locally — see `useIsLocal`. */
  isLocal: boolean
}

/** The shape all three questions are asked of; `Listable`, less the rest. */
type Available = {
  paths: readonly PathPattern[]
  roles: readonly RolePattern[]
  local?: boolean
}

/**
 * The rows of a list that belong here, in the order they came — here meaning
 * this path, this user, and this machine.
 *
 * All three or none, which is the whole reason they are asked in one place:
 * they are three questions about one row, a command has to survive being asked
 * every one of them, and a caller that filtered by two of the three would draw
 * a row the third had ruled out. Every place that draws commands goes through
 * this — the list, and the action panel — as does the shortcut matcher, so a
 * command the user cannot see is also a command whose keys do nothing.
 *
 * Where it is running is asked first because the answer is one boolean already
 * worked out, and the other two have paths to walk and sets to look in.
 */
export function availableHere<T extends Available>(
  items: readonly T[],
  { path, roles, isLocal }: Audience
): T[] {
  return availableTo(availableOn(availableLocally(items, isLocal), path), roles)
}
