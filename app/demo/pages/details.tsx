"use client"

import { notePage } from "./note"

export const detailsPage = notePage(
  "details",
  "How This Works",
  <>
    <p>
      The root list is a command registry: every row either opens a page or runs
      an action. Pages themselves are free-form — this one is a plain component
      with the frame&apos;s input switched off.
    </p>
    <ul className="list-disc space-y-1 pl-4">
      <li>
        Each page keeps its own query and selection; its React state survives
        too, because pages are hidden rather than unmounted.
      </li>
      <li>Esc clears the input first, then unwinds one level.</li>
      <li>
        A page (or a single push) can override that and jump straight to the
        root.
      </li>
      <li>Anything popped loses its state; anything still stacked keeps it.</li>
    </ul>
    <p className="text-xs">
      This page uses <code>search: &quot;hidden&quot;</code>, so the row above
      carries its title instead of an input. Pages that keep the input visible
      but inert use <code>search: &quot;disabled&quot;</code>. Neither takes the
      row away — the way back belongs to the frame, on every page.
    </p>
  </>,
  "hidden"
)
