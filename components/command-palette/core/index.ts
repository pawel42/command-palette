/**
 * The headless engine. Five concerns, in dependency order:
 *
 *   keys/     DOM key events -> intents; knows nothing about the palette
 *   list/     a query becomes ranked, grouped rows with one of them active
 *   page/     what a page is — a plain object — and how it is referenced
 *   routes/   where a command exists: the router's pathnames, as a type
 *   command/  what a row is, and what running it does
 *   stack/    the state machine: push, pop, esc, and the derived view
 *
 * plus three stateful modules that import none of the above: `async.ts`, which
 * holds what the palette is doing and what it has to say about it,
 * `refusal.ts`, which counts the presses it would not carry out, and
 * `store.ts`, which ties the stack, the commands and the tasks together.
 * Nothing in this folder imports React at runtime.
 *
 * `page/` and `command/` are the one pair that name each other: a command
 * targets a page, and a page declares a footer of commands. Type-only in both
 * directions, so the dependency order above still holds at runtime.
 */

export * from "./async"
export * from "./command"
export * from "./keys"
export * from "./list"
export * from "./page"
export * from "./refusal"
export * from "./routes"
export * from "./stack"
export { createPaletteStore } from "./store"
export type { DismissHandler, PaletteStore, PaletteStoreOptions } from "./store"
