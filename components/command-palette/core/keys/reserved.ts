/**
 * Chords the browser keeps for itself.
 *
 * These never reach the page at all: the window or the tab is gone before any
 * listener runs, so `preventDefault` has nothing to prevent. A command that
 * declares one is not a command with a broken shortcut — it is a command with
 * no shortcut, silently, which is the kind of thing that costs an afternoon.
 *
 * Nothing here can be fixed, only avoided, so the palette's contribution is to
 * say so out loud the first time it sees one — see `warnBrowserReserved`.
 */

import { getPlatform } from "./platform"
import type { Platform } from "./platform"
import { chordsOf } from "./sequence"
import type { Chord, KeyName, Modifier, Shortcut } from "./tokens"

/** Window and tab lifecycle, which a page never gets a say in. */
const EVERYWHERE: readonly KeyName[] = ["N", "T", "W"]

/**
 * The rest, per platform: quitting, hiding and minimising are the window
 * manager's on a Mac, and nothing below the browser on Windows or Linux.
 */
const MAC_ONLY: readonly KeyName[] = ["Q", "H", "M"]

function ownsKey(key: KeyName, shift: boolean, platform: Platform): boolean {
  if (EVERYWHERE.includes(key)) return true
  // ⌘⇧N is an incognito window, ⌘⇧T reopens a tab — the same three, shifted.
  if (shift) return false

  return platform === "mac" && MAC_ONLY.includes(key)
}

/**
 * Would the browser take this chord before the palette could? Only ever true
 * of a plain command chord: adding alt or ctrl takes it out of the browser's
 * hands everywhere.
 */
export function isBrowserReserved(
  chord: Chord,
  platform: Platform = getPlatform()
): boolean {
  const parts = chord as readonly (Modifier | KeyName)[]
  const modifiers = parts.filter(
    (part): part is Modifier =>
      part === "Mod" || part === "Shift" || part === "Alt" || part === "Ctrl"
  )
  const key = parts[parts.length - 1] as KeyName

  if (!modifiers.includes("Mod")) return false
  if (modifiers.includes("Alt") || modifiers.includes("Ctrl")) return false

  return ownsKey(key, modifiers.includes("Shift"), platform)
}

/** Said once per chord, and only in development. */
const warned = new Set<string>()

/**
 * Warns about shortcuts that will never fire in a browser tab.
 *
 * Called where shortcuts are read rather than where they are declared, because
 * a command is plain data and there is no moment of registration to hook —
 * every list and every footer passes through here instead.
 */
export function warnBrowserReserved(
  items: readonly { id: string; shortcut?: Shortcut }[]
): void {
  if (process.env.NODE_ENV === "production") return

  for (const item of items) {
    if (!item.shortcut) continue

    // Only the lead press matters: the rest of a sequence is read while the
    // palette is already holding the keyboard.
    const lead = chordsOf(item.shortcut)[0]
    if (!isBrowserReserved(lead)) continue

    const key = `${item.id}:${lead.join("+")}`
    if (warned.has(key)) continue
    warned.add(key)

    console.warn(
      `[command-palette] "${item.id}" declares ${lead.join("+")}, which the browser takes before the page sees it — it will never fire. Pick another chord.`
    )
  }
}
