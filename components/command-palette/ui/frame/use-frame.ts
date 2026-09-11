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

/** Focus the frame may act on: still in the document, and inside the frame. */
function isInside(
  root: HTMLElement | null,
  node: Element | null
): node is HTMLElement {
  return (
    root !== null &&
    node instanceof HTMLElement &&
    node.isConnected &&
    root.contains(node)
  )
}

/** What the browser would tab through, in document order. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

/**
 * Keeps tab inside the palette, wrapping at both ends.
 *
 * The dialog is non-modal, so nothing stops focus walking out the back of it
 * — and the first thing outside that takes focus dismisses the layer, which
 * closes the palette. Covering the app with `inert` hides the host's own
 * controls, but not a dev-tools overlay or anything else portalled beside it.
 *
 * Hidden pages are skipped: `Activity` hides with `display: none`, and an
 * element with no box has no client rects.
 */
function wrapTabFocus(event: React.KeyboardEvent, root: HTMLElement | null) {
  if (!root) return

  const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0
  )

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  // Nowhere to go: hold on to the press rather than hand focus to the page.
  if (!first) {
    event.preventDefault()
    return
  }

  // The frame itself counts as the start — it sits before its own children.
  const target = event.shiftKey
    ? active === first || active === root
      ? last
      : null
    : active === last
      ? first
      : null

  if (!target) return

  event.preventDefault()
  target.focus()
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
  /** Which instance the effect below last ran for — see `reopened`. */
  const previousInstanceId = useRef<string | null>(null)
  /** The last thing focused inside the frame, so a reveal can put it back. */
  const lastFocused = useRef<HTMLElement | null>(null)

  const editable = isEditable(view.search)
  const hasList = view.instance.page.list === true

  useEffect(() => {
    const instanceId = view.instance.instanceId

    // A shallower stack than last time means we came back to a page that
    // already holds a query.
    const cameBack =
      previousDepth.current !== null && view.depth < previousDepth.current

    // Same instance as last time, yet the effect is running again: nothing
    // navigated, the surface was hidden and shown. That is a close and
    // reopen — `Activity` tears effects down on the way out, which is the
    // only reason the frame can tell.
    const reopened = previousInstanceId.current === instanceId

    previousDepth.current = view.depth
    previousInstanceId.current = instanceId

    // Focus follows the page: the input when it can be typed into, and
    // otherwise the frame itself — key handling is React events, so without
    // focus inside the frame esc would never reach it.
    const root = rootRef.current

    if (editable) {
      inputRef.current?.focus()
      // Text that was already in the input — restored by a pop, or left there
      // when the palette was closed — is the thing the user is most likely to
      // replace, so it arrives selected: typing overwrites it, and the arrow
      // keys still put the caret back without losing it.
      if (cameBack || reopened) inputRef.current?.select()
    } else if (reopened && isInside(root, lastFocused.current)) {
      // Reopened on a page that owns its focus: back to the field the user
      // was in, the way the input above gets its text back.
      lastFocused.current.focus()
    } else if (!isInside(root, document.activeElement)) {
      // Only what nobody else claimed. A page that focuses a field of its own
      // — a form with `autoFocus`, say — keeps it: taking that away would
      // leave the user typing into nothing.
      root?.focus()
    }

    consumedByDelete.current = false
  }, [view.instance.instanceId, view.depth, editable])

  // Esc has to work even when focus is not in the palette. Keys reach the
  // frame as React events, so anything that steals focus — an overlay the host
  // portals beside us, a browser widget — leaves the frame deaf, and the
  // palette looks stuck. The window always hears the press; `claimEscape`
  // keeps this from acting a second time on a press the frame already took,
  // and the listener only exists while the surface is visible, because
  // `Activity` tears this effect down when it hides.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (isInside(rootRef.current, document.activeElement)) return
      if (!claimEscape({ nativeEvent: event })) return

      event.preventDefault()
      store.escape()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [store])

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
    onFocusCapture: (event: React.FocusEvent) => {
      // A click on anything the browser cannot focus — a row, a group
      // heading, the padding around them — lands on the frame instead, and
      // the caret leaves the input with it: arrow keys and typing would go
      // nowhere, because the list is driven from the input's key handler.
      // While the input is live it is the only thing here meant to hold a
      // caret, so hand focus straight back. A page whose search is off keeps
      // the frame focused instead — that is what makes esc work there.
      if (editable && event.target === rootRef.current) {
        inputRef.current?.focus()
        return
      }

      // Recorded as it happens, not read back on the way out: by the time the
      // surface hides, the host has already moved focus out of the palette.
      if (event.target instanceof HTMLElement)
        lastFocused.current = event.target
    },
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

      if (event.key === "Tab") {
        wrapTabFocus(event, rootRef.current)
        return
      }

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
