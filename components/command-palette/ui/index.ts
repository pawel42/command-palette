/**
 * The rendered palette. Everything here is markup and browser behavior; the
 * rules it applies live in `../core`.
 *
 *   palette.tsx   the two halves a host composes: state, and the visible surface
 *   frame/        the chrome around every page — the one input and the footer
 *   list-page/    the body the palette draws for a page that declared items
 *   dialog/       the opinionated ⌘K host, and the only place radix-ui appears
 *   root-page.ts  the root every host builds from the commands it is handed
 *   internal/     the frame↔page channel; not part of the public surface
 */

export * from "./dialog"
export * from "./frame"
export * from "./list-page"
export { CommandPalette, PaletteRoot, PaletteSurface } from "./palette"
export { PageHost } from "./page-host"
export { useRootPage } from "./root-page"
export type { RootConfig } from "./root-page"
export { Highlight, ICONS, Icon, Kbd, SearchIcon } from "./primitives"
