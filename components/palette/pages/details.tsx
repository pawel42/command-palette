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
      <li>Each page keeps its own query, selection and state.</li>
      <li>Esc clears the input first, then unwinds one level.</li>
      <li>
        A page (or a single push) can override that and jump straight to the
        root.
      </li>
      <li>Anything popped loses its state; anything still stacked keeps it.</li>
    </ul>
    <p className="text-xs">
      This page uses <code>search: &quot;hidden&quot;</code>, so the input row
      is gone entirely. Pages that keep it visible but inert use{" "}
      <code>search: &quot;disabled&quot;</code>.
    </p>
  </>,
  "hidden"
)
