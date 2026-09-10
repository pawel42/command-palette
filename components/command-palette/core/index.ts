/**
 * The headless engine. Five concerns, in dependency order:
 *
 *   keys/     DOM key events -> intents; knows nothing about the palette
 *   list/     a query becomes ranked, grouped rows with one of them active
 *   page/     what a page is, and how it is referenced
 *   command/  what a row is, and what running it does
 *   stack/    the state machine: push, pop, esc, and the derived view
 *
 * plus `store.ts`, which is the only stateful thing here and ties the last
 * two together. Nothing in this folder imports React at runtime.
 */

export * from "./command"
export * from "./keys"
export * from "./list"
export * from "./page"
export * from "./stack"
export { createPaletteStore } from "./store"
export type { DismissHandler, PaletteStore, PaletteStoreOptions } from "./store"
