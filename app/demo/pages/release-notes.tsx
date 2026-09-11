"use client"

import { useState } from "react"
import type { ComponentType } from "react"

import {
  definePage,
  Icon,
  ICONS,
  Kbd,
  useNavigation,
} from "@/components/command-palette"

type Release = {
  version: string
  date: string
  headline: string
  notes: string[]
}

const RELEASES: Release[] = [
  {
    version: "0.15.0",
    date: "Sep 2026",
    headline: "Pages own their own state",
    notes: [
      "Hidden pages keep their React state, so the engine holds none of it.",
      "Scroll offsets moved into the hook that restores them.",
    ],
  },
  {
    version: "0.14.0",
    date: "Sep 2026",
    headline: "Pages are never thrown away",
    notes: [
      "The stack stays mounted, so a page keeps its state however it stores it.",
      "Scroll offsets ride along on the instance.",
    ],
  },
  {
    version: "0.13.2",
    date: "Sep 2026",
    headline: "Dialog goes non-modal",
    notes: [
      "The app shell is marked inert while the palette is open instead.",
      "Body scroll is locked by hand, and focus returns where it came from.",
    ],
  },
  {
    version: "0.13.0",
    date: "Aug 2026",
    headline: "The palette outlives its dialog",
    notes: ["The engine was hoisted above the dialog, so closing is a hide."],
  },
  {
    version: "0.12.1",
    date: "Aug 2026",
    headline: "Backspace unwinds",
    notes: [
      "An empty input plus backspace goes back a page.",
      "A press that deleted text never doubles as a back.",
    ],
  },
  {
    version: "0.12.0",
    date: "Aug 2026",
    headline: "Esc is the palette's, not the dialog's",
    notes: [
      "Esc clears the input first, then unwinds along the page's route.",
      "Only esc at the root with an empty input dismisses.",
    ],
  },
  {
    version: "0.11.0",
    date: "Jul 2026",
    headline: "Awaited pushes",
    notes: [
      "nav.push returns a promise that a page settles with resolve().",
      "Dismissing a picker settles it as undefined.",
    ],
  },
  {
    version: "0.10.0",
    date: "Jul 2026",
    headline: "Per-instance query",
    notes: ["Each page owns its search text; going back restores it."],
  },
  {
    version: "0.9.0",
    date: "Jun 2026",
    headline: "Instances, not pages",
    notes: [
      "The same page can sit on the stack twice with separate state.",
      "An action aimed at a dropped instance is a no-op, not a crash.",
    ],
  },
  {
    version: "0.8.0",
    date: "Jun 2026",
    headline: "Escape routes",
    notes: [
      "A page can send esc to the root, or to a page further down.",
      "A push site can override the target's own route.",
    ],
  },
  {
    version: "0.7.0",
    date: "May 2026",
    headline: "Item shortcuts",
    notes: ["Rows can carry their own chord, matched before list keys."],
  },
  {
    version: "0.6.0",
    date: "May 2026",
    headline: "Sections and fuzzy scoring",
    notes: [
      "Matches are ranked, and matched characters are highlighted.",
      "Disabled rows are skipped by keyboard navigation.",
    ],
  },
  {
    version: "0.5.0",
    date: "Apr 2026",
    headline: "One input, four modes",
    notes: [
      "filter, input, disabled and hidden cover every page shape so far.",
    ],
  },
  {
    version: "0.4.0",
    date: "Apr 2026",
    headline: "The frame moved out of the pages",
    notes: ["Pages publish their key handling and aria ids to the frame."],
  },
  {
    version: "0.3.0",
    date: "Mar 2026",
    headline: "A store instead of context state",
    notes: [
      "Command handlers dispatch from outside React with no stale closures.",
      "useSyncExternalStore keeps updates out of effects.",
    ],
  },
]

/**
 * A long page, to show what surviving a close actually means. Nothing here is
 * held by the engine: `detailed` below is a plain `useState`, and the scroll
 * offset is the browser's own. Close the palette halfway down the list and
 * reopen it — both come back, because the page is hidden rather than unmounted.
 */
export const releaseNotesPage = definePage<void, void, ComponentType>({
  id: "release-notes",
  title: "Release Notes",
  search: "hidden",
  component: ReleaseNotes,
})

function ReleaseNotes() {
  const nav = useNavigation()
  const [detailed, setDetailed] = useState(true)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <Icon path={ICONS.clock} className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Release Notes</h2>

        <button
          type="button"
          onClick={() => setDetailed((previous) => !previous)}
          className="ml-auto rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {detailed ? "Compact" : "Detailed"}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 text-sm">
        {RELEASES.map((release) => (
          <article key={release.version} className="space-y-1.5">
            <h3 className="flex items-baseline gap-2">
              <span className="font-medium tabular-nums">
                {release.version}
              </span>
              <span className="text-xs text-muted-foreground">
                {release.date}
              </span>
            </h3>

            <p className="text-muted-foreground">{release.headline}</p>

            {detailed && (
              <ul className="space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">
                {release.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </article>
        ))}

        <button
          type="button"
          onClick={() => nav.pop()}
          className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Kbd>esc</Kbd> go back
        </button>
      </div>
    </div>
  )
}
