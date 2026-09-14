"use client"

import { useEffect, useId, useRef, useState } from "react"

import {
  ACTIONS_SHORTCUT,
  RESERVED_SHORTCUTS,
  ariaKeyShortcut,
  availableOn,
  availableTo,
  claimEscape,
  clearPending,
  isEditable,
  isSequence,
  matchesAny,
  matchesShortcut,
  resolveBackspace,
  resolveShortcut,
} from "../../core"
import type { Chord, Command, FooterHint, Shortcut } from "../../core"
import {
  useCurrentPath,
  useCurrentRoles,
  usePaletteStore,
  usePaletteTasks,
  usePaletteView,
  usePendingKeys,
  usePlatform,
  useSearch,
} from "../../react"

import { useFrameBridge, useFrameFooter } from "../internal/bridge"

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
 * A tab press this frame has answered, taken out of the room entirely.
 *
 * Stopping it matters more than preventing it, and only one of the two is
 * obvious. Radix's `FocusScope` — the dialog the palette is drawn inside —
 * keeps its own tab handler above this one, and that handler reads
 * `document.activeElement` rather than the event's target: find the last
 * tabbable element focused and it loops round to the first. By the time it
 * runs, focus has already moved, so a step *onto* the last field reads to it
 * as a press *from* the last field and it wraps a ring that had one stop left
 * in it — the description of an issue, skipped on the way past. It does not
 * consult `defaultPrevented`, so the only way to say the press is spent is to
 * stop it here.
 */
function spend(event: React.KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Every tab press in the palette, answered here: one step along the palette's
 * own ring, wrapping at both ends.
 *
 * The wrap is the structural half. The dialog is non-modal, so nothing stops
 * focus walking out the back of it — and the first thing outside that takes
 * focus dismisses the layer, which closes the palette. Covering the app with
 * `inert` hides the host's own controls, but not a dev-tools overlay or
 * anything else portalled beside it.
 *
 * The *step* is the half that has to be taken too, and it is the surprising
 * one. Whether tab stops on a `<button>` at all is a system preference on
 * macOS — Full Keyboard Access, off by default, and Safari's "press tab to
 * highlight each item" with it. Every control in a palette form that is not a
 * text box is a button: Radix draws a checkbox, a radio and a select's trigger
 * as one. So on a stock Mac a form like New Issue has two tab stops, the title
 * and the description, and the eight fields between them cannot be reached by
 * keyboard at all — silently, and only for some of the people using it.
 *
 * A palette is a keyboard surface before it is anything else, so its tab ring
 * is not a thing to leave to a checkbox in System Settings. The order is still
 * the DOM's and the stops are still the ones the browser would pick; what is
 * no longer asked is whether this browser, on this OS, feels like stopping on
 * them.
 *
 * Hidden pages are skipped: `Activity` hides with `display: none`, and an
 * element with no box has no client rects.
 */
function moveTabFocus(event: React.KeyboardEvent, root: HTMLElement | null) {
  if (!root) return

  const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0
  )

  // A composite widget and its own items both answer the selector, and only
  // the items are stops: Radix's radio group carries `tabindex="0"` on the
  // group *and* on the checked item, and focusing the group only bounces
  // focus to that item — a stop that lands somewhere else is a press spent on
  // nothing. Keeping the innermost is what the browser does with the pair too.
  const stops = focusable.filter(
    (element) =>
      !focusable.some((other) => other !== element && element.contains(other))
  )

  // Nowhere to go: hold on to the press rather than hand focus to the page.
  if (stops.length === 0) {
    spend(event)
    return
  }

  const active = document.activeElement
  // `contains`, not identity: focus may be on something nested inside a stop.
  const from = stops.findIndex((element) => element.contains(active))
  const step = event.shiftKey ? -1 : 1
  // Off the ring — the frame itself holds focus — enters from the end the
  // press is coming from, so the first tab lands on the first field.
  const next =
    from === -1
      ? stops[event.shiftKey ? stops.length - 1 : 0]
      : stops[(from + step + stops.length) % stops.length]

  spend(event)
  next.focus()
}

/** One arrow press worth of scrolling, which is what browsers step by too. */
const SCROLL_STEP = 40

/**
 * What the keys should scroll: the page slot when the page overruns it, and
 * otherwise a box the page scrolls on its own.
 *
 * The second case is the common one, not the exotic one — a list page fills
 * the slot exactly and scrolls inside itself, so the slot never overflows and
 * the loop below is what finds the real scroller. Pages keep their own boxes
 * rather than sharing the slot's, because that is what makes an offset survive
 * being covered: `Activity` hands a hidden page its scroll position back with
 * its DOM, and one shared box would hand every page the same one.
 *
 * Hidden pages need no skipping — with no layout they measure 0 against 0.
 * Read on the press rather than remembered, so a page that only starts
 * overflowing later — Release Notes switched from Compact to Detailed — needs
 * no telling.
 */
function scrollRegion(slot: HTMLElement | null): HTMLElement | null {
  if (!slot) return null
  if (slot.scrollHeight > slot.clientHeight) return slot

  for (const element of slot.querySelectorAll<HTMLElement>("*")) {
    if (element.scrollHeight <= element.clientHeight) continue

    const { overflowY } = getComputedStyle(element)
    if (overflowY === "auto" || overflowY === "scroll") return element
  }

  return null
}

/**
 * Keyboard scrolling, which the browser will not do for us: it scrolls the
 * nearest scrollable *ancestor* of whatever holds focus, and the frame parks
 * focus on itself — the box's parent, not the box. So the keys land on nothing
 * until focus happens to fall inside the box, which is what made this look so
 * arbitrary: on Release Notes it started working two tab stops in, at the "go
 * back" button that happens to sit inside the notes.
 *
 * Every press is taken, including the ones the browser would have handled from
 * inside the box, so that one press means one step wherever focus sits — and
 * never two, once from each of us. Typing fields are filtered out before this.
 *
 * The arrows read their modifiers the way the list's do: ⌥ covers more ground
 * per press, ⌘ goes the whole way.
 *
 * Returns true when the press was spent.
 */
function scrollByKey(event: React.KeyboardEvent, slot: HTMLElement | null) {
  const region = scrollRegion(slot)
  if (!region) return false

  // A screen at a time, less a line to carry the reader's place over — the
  // same overlap browsers leave.
  const page = Math.max(region.clientHeight - SCROLL_STEP, SCROLL_STEP)
  const step = event.altKey ? page : SCROLL_STEP
  const toEnd = event.metaKey || event.ctrlKey

  switch (event.key) {
    case "ArrowDown":
      if (toEnd) region.scrollTo({ top: region.scrollHeight })
      else region.scrollBy({ top: step })
      break
    case "ArrowUp":
      if (toEnd) region.scrollTo({ top: 0 })
      else region.scrollBy({ top: -step })
      break
    case "PageDown":
      region.scrollBy({ top: page })
      break
    case "PageUp":
      region.scrollBy({ top: -page })
      break
    case "Home":
      region.scrollTo({ top: 0 })
      break
    case "End":
      region.scrollTo({ top: region.scrollHeight })
      break
    default:
      return false
  }

  event.preventDefault()
  return true
}

/**
 * Inside a field the user is typing in, only a command chord may fire: a bare
 * letter would be taken out of the middle of a word. `Mod` is whichever key
 * that is here — ctrl off the Mac — and `Ctrl` is the literal one.
 */
function hasCommandModifier(shortcut: Shortcut): boolean {
  const lead = (isSequence(shortcut) ? shortcut[0] : shortcut) as Chord

  return lead.some((part) => part === "Mod" || part === "Ctrl")
}

/**
 * Everything the frame does that isn't markup: focus, the esc and backspace
 * rules, the footer hints, and the action panel. The component below it only
 * lays out what this returns.
 */
export function usePaletteFrame({ revealId }: { revealId?: number } = {}) {
  const view = usePaletteView()
  const store = usePaletteStore()
  const platform = usePlatform()
  // The presses a half-finished sequence is holding — see `core/keys/sequence`.
  const pending = usePendingKeys()
  const [query, setQuery] = useSearch()
  const { getKeyHandler, activeOptionId, listId } = useFrameBridge()
  const { footer, getFooter } = useFrameFooter()
  const path = useCurrentPath()
  const roles = useCurrentRoles()
  // Palette-wide, not per page: a run outlives the row that started it, and it
  // is reported wherever the user has got to by the time it lands.
  const { busy, toast } = usePaletteTasks()

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** The page area, which is what the scroll keys act on. */
  const slotRef = useRef<HTMLDivElement>(null)
  /** Set while a backspace press is spending itself on text; cleared on keyup. */
  const consumedByDelete = useRef(false)
  /** Where the last render left the stack, so the next one can tell push from pop. */
  const previousDepth = useRef<number | null>(null)
  /** Which reveal the effect below last ran for — see `reopened`. */
  const previousRevealId = useRef<number | null>(null)
  /** The last thing focused inside the frame, so a reveal can put it back. */
  const lastFocused = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const editable = isEditable(view.search)
  // A list is a component inside the page's body, so the page object cannot
  // say whether one is there — but a mounted list publishes its ids through
  // the bridge, and takes them with it when it goes.
  const hasList = listId !== undefined
  // A footer's actions answer to the path and to the user like any other
  // command: an action that does not exist here, or is not theirs, is out of
  // the panel and its shortcut is dead.
  const actions = availableTo(availableOn(footer.actions ?? [], path), roles)

  /**
   * The same, live — see `runActionShortcut` for why it cannot be the drawn
   * one. Both filters have to be repeated here rather than only above: this is
   * what the shortcut matcher reads, and an action that is merely undrawn would
   * otherwise still fire on its keys.
   */
  const liveActions = () =>
    availableTo(availableOn(getFooter().actions ?? [], path), roles)

  /**
   * The panel is open *for* one page on one showing of the palette — never
   * open as a plain flag. A push, a pop, a reset and a hide→reveal each move
   * one half of this pair, so the panel is shut on the very render that brings
   * the new page in, with no effect to run and no frame in between where it is
   * mounted over the wrong page.
   *
   * Both halves earn their place: the instance id misses a close and reopen
   * (the instance is untouched by it), and `revealId` misses a push or a pop.
   * `reset()` on an untouched root moves neither the stack nor the id, which is
   * why `revealId` has to be in here too.
   */
  const [openFor, setOpenFor] = useState<{
    instanceId: string
    revealId?: number
  } | null>(null)

  const panelOpen =
    openFor !== null &&
    openFor.instanceId === view.instance.instanceId &&
    openFor.revealId === revealId

  /** Where focus belongs when nothing else has claimed it. */
  const focusFrame = () => {
    if (editable) inputRef.current?.focus()
    else rootRef.current?.focus()
  }

  // Focus first, then unmount. A panel that unmounts while its input holds the
  // caret leaves `document.activeElement` on <body> — outside the frame, where
  // every React key handler goes deaf and only the window's esc listener still
  // fires, which unwinds the stack instead of closing anything.
  const closePanel = () => {
    focusFrame()
    setOpenFor(null)
  }

  const openPanel = () =>
    setOpenFor({ instanceId: view.instance.instanceId, revealId })

  const togglePanel = () => {
    if (panelOpen) closePanel()
    else if (actions.length > 0) openPanel()
  }

  /**
   * Runs a page's own shortcut with the panel closed. Looked up in the live
   * footer rather than the drawn one, because the drawn one's handlers are as
   * old as its signature — see the bridge.
   *
   * Returns true when the press was spent, which a sequence spends two of:
   * the one that opens it and the one that finishes or abandons it.
   */
  const runActionShortcut = (event: React.KeyboardEvent) => {
    // Held, not pressed: one chord is one action.
    if (event.repeat) return false
    // The toggle and the panel stay the palette's, whatever a page declares.
    if (matchesAny(RESERVED_SHORTCUTS, event)) return false

    const typing = isTypingTarget(event.target)
    const waiting = pending.length > 0

    // A bare press is never taken out of a field the user is typing in —
    // unless the palette is already holding a sequence, in which case the
    // user is finishing a chord, not typing a word.
    if (typing && !waiting && !(event.metaKey || event.ctrlKey)) return false

    const outcome = resolveShortcut(liveActions(), event, {
      // The lead press has to survive a form field, so it must carry a
      // modifier there. The type says so for sequences; this is the rest.
      eligible: (action: Command) =>
        !(typing && !waiting && !hasCommandModifier(action.shortcut!)),
    })

    if (outcome.type === "none") return false

    event.preventDefault()
    if (outcome.type === "run") store.runCommand(outcome.item)
    return true
  }

  useEffect(() => {
    // A shallower stack than last time means we came back to a page that
    // already holds a query.
    const cameBack =
      previousDepth.current !== null && view.depth < previousDepth.current

    // The host counts its own reveals, so this is a fact rather than a
    // reading of one: a moved count means the surface was shown again. It
    // cannot be inferred from anything here, because a reopen inside the
    // close animation never hides the surface in the first place — the DOM,
    // the state and the effects all sit untouched through it.
    const reopened =
      previousRevealId.current !== null && previousRevealId.current !== revealId

    previousDepth.current = view.depth
    previousRevealId.current = revealId ?? null

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
    // A half-pressed sequence does not survive the page it was started on,
    // nor the palette being closed and opened again.
    clearPending()
  }, [view.instance.instanceId, view.depth, editable, revealId])

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
    /** The bar is `aria-hidden`; this is what says the same thing out loud. */
    "aria-busy": busy || undefined,
    // Every click inside the palette passes through here, so the panel needs
    // no document listener to know it was dismissed — and a click outside the
    // palette is the dialog's own dismissal, which the token above shuts the
    // panel for anyway. Capture, so it lands before a row's onClick.
    onPointerDownCapture: (event: React.PointerEvent) => {
      if (!panelOpen) return

      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      // Without this the trigger would close on pointerdown and reopen on the
      // click that follows, and look like it does nothing.
      if (triggerRef.current?.contains(target)) return

      closePanel()
    },
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

        // A way out of a sequence that was started by mistake. Before the
        // panel and before the stack: while the palette is holding a press,
        // esc is about that press and nothing else.
        if (pending.length > 0) {
          claimEscape(event)
          clearPending()
          return
        }

        if (panelOpen) {
          // The return value is ignored, but the call is the whole mechanism:
          // spending the press here is what stops the frame's own rule — and
          // the window listener — unwinding a page behind the panel.
          claimEscape(event)
          closePanel()
          return
        }

        // Claimed, not skipped: the page's handler may already have spent this
        // press on the way up from the input.
        if (claimEscape(event)) store.escape()
        return
      }

      // The palette's own chord, before the page gets a say in it.
      if (matchesShortcut(ACTIONS_SHORTCUT, event)) {
        event.preventDefault()
        if (!event.repeat) togglePanel()
        return
      }

      // The page had first refusal on everything else.
      if (event.defaultPrevented) return

      if (event.key === "Tab") {
        // While the panel is up it is the whole focus ring: there is nothing
        // behind it worth tabbing to.
        moveTabFocus(event, panelOpen ? panelRef.current : rootRef.current)
        return
      }

      // The panel owns the rest of the keyboard while it is open — including
      // the arrows, which would otherwise also scroll the page underneath it.
      if (panelOpen) return

      if (runActionShortcut(event)) return

      // A field's own caret keys are never the frame's to take.
      if (isTypingTarget(event.target)) {
        handleBackspace(event, true)
        return
      }

      if (scrollByKey(event, slotRef.current)) return

      // Reached from pages with no input of their own.
      handleBackspace(event, false)
    },
  }

  // Only ever spread onto an input that is rendered, which is only on an
  // editable page — so nothing in here has a disabled case to answer for.
  const inputProps = {
    ref: inputRef,
    value: query,
    placeholder: view.placeholder ?? "Search…",
    autoComplete: "off",
    autoCorrect: "off" as const,
    spellCheck: false,
    role: "combobox",
    // Stood down while the panel is up: two live comboboxes each claiming an
    // active row is a lie to a screen reader, and only one of them has focus.
    "aria-expanded": !panelOpen,
    "aria-controls": panelOpen ? undefined : listId,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant": panelOpen ? undefined : activeOptionId,
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

  const hints: FooterHint[] = [
    ...(hasList
      ? ([
          { keys: ["ArrowUp", "ArrowDown"], label: "navigate" },
          { keys: ["Enter"], label: "select" },
        ] satisfies FooterHint[])
      : []),
    {
      keys: ["Escape"],
      label: editable && query ? "clear" : view.isRoot ? "clear" : "back",
    },
    // Backspace also goes back, and is deliberately not advertised. It says
    // the same thing esc has already said one legend to the left, and a
    // footer that lists every key that works is a footer nobody reads. A page
    // that wants it back declares the hint itself.
    // The page's own, last: the frame's keys are the ones that are true
    // everywhere, and they should not move as pages come and go.
    ...(footer.hints ?? []),
  ]

  return {
    view,
    editable,
    /** The presses a sequence is still waiting on — see `usePendingKeys`. */
    pending,
    /** Something is running, and has been for long enough to say so. */
    busy,
    /** The one outcome the footer is showing, if any. */
    toast,
    /** What the row says when there is no input — see `SearchMode`. */
    title:
      view.instance.page.title ?? view.placeholder ?? view.instance.page.id,
    rootProps,
    slotProps: { ref: slotRef },
    inputProps,
    hints,
    goBack: () => store.navigation.pop(),
    panel: {
      open: panelOpen,
      id: panelId,
      ref: panelRef,
      actions,
      getActions: liveActions,
      close: closePanel,
    },
    /** The footer's right-hand control. Empty footers get no trigger. */
    triggerProps:
      actions.length === 0
        ? null
        : {
            ref: triggerRef,
            type: "button" as const,
            // Out of the tab order, for the reason the "go back" button is:
            // it repeats a chord it is itself spelling out, and on a page of
            // form fields it would sit in the middle of the run of tab stops
            // the user is actually filling in.
            tabIndex: -1,
            onClick: togglePanel,
            "aria-haspopup": "dialog" as const,
            "aria-expanded": panelOpen,
            "aria-controls": panelOpen ? panelId : undefined,
            "aria-keyshortcuts": ariaKeyShortcut(ACTIONS_SHORTCUT, platform),
          },
  }
}
