"use client"

import { useEffect, useRef } from "react"

import { claimEscape, isEditable, resolveBackspace } from "../../core"
import { usePaletteStore, usePaletteView, useSearch } from "../../react"

import { useFrameBridge } from "../internal/bridge"

/** Backspace must never be stolen from a field the user is typing in. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export type FrameHint = { keys: string[]; label: string }

/**
 * Everything the frame does that isn't markup: focus, the esc and backspace
 * rules, and the footer hints. The component below it only lays out what this
 * returns.
 */
export function usePaletteFrame() {
  const view = usePaletteView()
  const store = usePaletteStore()
  const [query, setQuery] = useSearch()
  const { getKeyHandler, activeOptionId, listId } = useFrameBridge()

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** Set while a backspace press is spending itself on text; cleared on keyup. */
  const consumedByDelete = useRef(false)
  /** Where the last render left the stack, so the next one can tell push from pop. */
  const previousDepth = useRef<number | null>(null)

  const editable = isEditable(view.search)
  const hasList = view.instance.page.list === true

  useEffect(() => {
    // A shallower stack than last time means we came back to a page that
    // already holds a query. That restored text is the thing the user is most
    // likely to replace, so it arrives selected: typing overwrites it, and the
    // arrow keys still put the caret back without losing it.
    const cameBack =
      previousDepth.current !== null && view.depth < previousDepth.current
    previousDepth.current = view.depth

    // Focus follows the page: the input when it can be typed into, otherwise
    // the frame itself — key handling is React events, so without focus inside
    // the frame esc would never reach it.
    if (editable) {
      inputRef.current?.focus()
      if (cameBack) inputRef.current?.select()
    } else rootRef.current?.focus()

    consumedByDelete.current = false
  }, [view.instance.instanceId, view.depth, editable])

  /** Returns true when the press was handled and should go no further. */
  const handleBackspace = (
    event: React.KeyboardEvent,
    inTypingField: boolean
  ) => {
    const outcome = resolveBackspace(event, {
      query,
      isRoot: view.isRoot,
      consumedByDelete: consumedByDelete.current,
      inTypingField,
    })

    if (outcome === "delete") {
      // Only the palette's own input feeds the guard; other fields keep to
      // themselves.
      if (!inTypingField) consumedByDelete.current = true
      return false
    }

    if (outcome === "back") {
      event.preventDefault()
      store.escape()
      return true
    }

    return false
  }

  const rootProps = {
    ref: rootRef,
    tabIndex: -1,
    onKeyDown: (event: React.KeyboardEvent) => {
      // Esc is checked before the defaultPrevented guard on purpose. A
      // surrounding dialog may already have marked the event in the capture
      // phase, and the palette's own rule still has to run.
      if (event.key === "Escape") {
        event.preventDefault()
        // Claimed, not skipped: the page's handler may already have spent this
        // press on the way up from the input.
        if (claimEscape(event)) store.escape()
        return
      }

      // The page had first refusal on everything else.
      if (event.defaultPrevented) return

      // Reached from pages whose input is disabled or hidden.
      handleBackspace(event, isTypingTarget(event.target))
    },
  }

  const inputProps = {
    ref: inputRef,
    value: editable ? query : "",
    disabled: !editable,
    placeholder:
      view.placeholder ?? (editable ? "Search…" : view.instance.page.title),
    autoComplete: "off",
    autoCorrect: "off" as const,
    spellCheck: false,
    role: "combobox",
    "aria-expanded": editable,
    "aria-controls": editable ? listId : undefined,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant": editable ? activeOptionId : undefined,
    "aria-label": view.placeholder ?? "Search",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setQuery(event.target.value),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (handleBackspace(event, false)) return
      getKeyHandler()?.(event)
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace") consumedByDelete.current = false
    },
  }

  const hints: FrameHint[] = [
    ...(hasList
      ? [
          { keys: ["↑", "↓"], label: "navigate" },
          { keys: ["↵"], label: "select" },
        ]
      : []),
    {
      keys: ["esc"],
      label: editable && query ? "clear" : view.isRoot ? "clear" : "back",
    },
    ...(!view.isRoot && !query ? [{ keys: ["⌫"], label: "back" }] : []),
  ]

  return {
    view,
    editable,
    showInput: view.search !== "hidden",
    rootProps,
    inputProps,
    hints,
    goBack: () => store.navigation.pop(),
  }
}
