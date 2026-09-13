/**
 * Which keyboard the palette is being read on.
 *
 * `Mod` in a declared chord means "the key this platform runs commands with":
 * ⌘ on a Mac, ctrl on Windows and Linux. One declaration, matched and drawn
 * per platform, so a host never spells the same chord twice.
 */
export type Platform = "mac" | "pc"

/** The modifier `Mod` stands for here. */
export function commandModifier(platform: Platform): "metaKey" | "ctrlKey" {
  return platform === "mac" ? "metaKey" : "ctrlKey"
}

/**
 * What to assume with no `navigator` to ask: a server render, or the
 * walkthrough script. The Mac spelling is the one the static markup ships
 * with, so the server draws that and the first client render corrects it —
 * which costs the Mac nothing and costs everywhere else one swap, on the
 * platform that would otherwise be shown the wrong key for good.
 */
export const DEFAULT_PLATFORM: Platform = "mac"

/**
 * Cached after the first read, which is safe because it cannot change under a
 * running page — but only ever filled in where there is a `navigator` to read,
 * so the browser is never handed the fallback above.
 */
let cached: Platform | null = null

function read(): Platform {
  const nav = navigator as {
    userAgentData?: { platform?: string }
    platform?: string
    userAgent?: string
  }

  // `userAgentData` where it exists — `platform` is the deprecated one, and
  // the user agent string is the last resort. iPadOS reports a Mac in all
  // three, which is right: it is a ⌘ keyboard.
  const source =
    nav.userAgentData?.platform || nav.platform || nav.userAgent || ""

  return /mac|iphone|ipad|ipod/i.test(source) ? "mac" : "pc"
}

export function getPlatform(): Platform {
  if (cached) return cached
  if (typeof navigator === "undefined") return DEFAULT_PLATFORM

  cached = read()
  return cached
}
