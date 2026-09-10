/**
 * A command palette in one folder: copy it anywhere, no build step.
 *
 *   core/    the headless engine — pages, commands, the stack, the key rules
 *   react/   the bindings: one provider, a handful of hooks, no markup
 *   ui/      the rendered surface, including the ⌘K dialog host
 *
 * Imports run one way only, `core → react → ui`, and never leave this folder.
 * See README.md for what the host has to provide.
 */

export * from "./core"
export * from "./react"
export * from "./ui"
