/**
 * The rendered palette. Everything here is markup and browser behavior; the
 * rules it applies live in `../core`.
 *
 *   palette.tsx   the two halves a host composes: state, and the visible surface
 *   frame/        the chrome around every page — the one input and the footer
 *   list-page/    the one prebuilt page kind: a filtered, navigable list
 *   dialog/       the opinionated ⌘K host, and the only place radix-ui appears
 *   internal/     the frame↔page channel; not part of the public surface
 */

export * from "./dialog"
export * from "./frame"
export * from "./list-page"
export { CommandPalette, PaletteRoot, PaletteSurface } from "./palette"
export { PageHost } from "./page-host"
export { Highlight, ICONS, Icon, Kbd, SearchIcon } from "./primitives"
