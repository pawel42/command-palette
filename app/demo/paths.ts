import type { PathPattern } from "@/components/command-palette"

/**
 * The one rule that means "wherever the user is". Spelled out rather than
 * implied: a command is available nowhere until its `paths` says otherwise,
 * so the commands that really do belong everywhere say so in as many words.
 *
 * Rows built inside a page are mostly this. The page is somewhere the user
 * already is, and it was a command answerable to the path that let them in —
 * so the rules that matter are up in the registry, and the rows below them are
 * the page's own business.
 */
export const EVERYWHERE = ["/*"] as const satisfies readonly PathPattern[]
