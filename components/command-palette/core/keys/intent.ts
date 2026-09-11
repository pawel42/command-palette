/** The subset of KeyboardEvent these rules read, so they can be reasoned about plainly. */
export type KeyEvent = {
  key: string
  /** True for the auto-repeats a held key produces. */
  repeat?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

export type ListIntent =
  | { type: "move"; direction: 1 | -1 }
  | { type: "edge"; edge: "first" | "last" }
  | { type: "select" }
  | { type: "escape" }

/** ⌘ on a Mac, ctrl everywhere else — the pairing the toggle hotkey uses. */
function toEdge(event: KeyEvent): boolean {
  return Boolean(event.metaKey || event.ctrlKey)
}

export function resolveKey(event: KeyEvent): ListIntent | null {
  switch (event.key) {
    case "ArrowDown":
      if (toEdge(event)) return { type: "edge", edge: "last" }
      return { type: "move", direction: 1 }
    case "ArrowUp":
      if (toEdge(event)) return { type: "edge", edge: "first" }
      return { type: "move", direction: -1 }
    case "Home":
      return { type: "edge", edge: "first" }
    case "End":
      return { type: "edge", edge: "last" }
    case "Enter":
      return { type: "select" }
    case "Escape":
      return { type: "escape" }
    default:
      return null
  }
}
