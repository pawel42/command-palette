"use client"

/** Presentational pieces shared by the frame and the built-in pages. */

import { formatKey } from "../core"
import { usePlatform } from "../react"

/**
 * How anything arriving in the footer's left half comes in: the toast, and the
 * key hints when they come back afterwards. One constant, because "the same
 * way" is the requirement — that half swaps between the two on every run, and
 * two animations that merely resembled each other would read as a stutter.
 */
export const FOOTER_ENTER = "animate-in fade-in-0 slide-in-from-bottom-1"

/**
 * One key, drawn the way the keyboard under the user prints it.
 *
 * Keys are declared by name — `["Mod", "Shift", "K"]`, the tokens in a footer
 * hint — and turned into something printable here and only here: ⌘⇧K on a Mac,
 * Ctrl Shift K on Windows and Linux. A string that is not a key name is drawn
 * as given, so this is still the box to put any small legend in.
 */
export function Kbd({ children }: { children: React.ReactNode }) {
  const platform = usePlatform()

  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {typeof children === "string" ? formatKey(children, platform) : children}
    </kbd>
  )
}

/** Bolds the characters the fuzzy matcher hit. */
export function Highlight({
  text,
  indices,
}: {
  text: string
  indices: readonly number[]
}) {
  if (indices.length === 0) return <>{text}</>

  const marked = new Set(indices)
  const parts: React.ReactNode[] = []
  let buffer = ""
  let bufferMarked = marked.has(0)

  const flush = (key: number) => {
    if (!buffer) return
    parts.push(
      bufferMarked ? (
        <mark
          key={key}
          className="bg-transparent font-semibold text-foreground"
        >
          {buffer}
        </mark>
      ) : (
        <span key={key}>{buffer}</span>
      )
    )
    buffer = ""
  }

  for (let i = 0; i < text.length; i++) {
    const isMarked = marked.has(i)
    if (isMarked !== bufferMarked) {
      flush(i)
      bufferMarked = isMarked
    }
    buffer += text[i]
  }
  flush(text.length)

  return <>{parts}</>
}

export function Icon({
  path,
  className,
}: {
  path: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-4"}
    >
      <path d={path} />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 shrink-0"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export const ICONS = {
  branch:
    "M6 3v12a3 3 0 0 0 3 3h6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4m12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  plus: "M12 5v14M5 12h14",
  folder:
    "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  layers: "m12 3 9 5-9 5-9-5zm9 9-9 5-9-5m18 4-9 5-9-5",
  book: "M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2zm3 0v14",
  moon: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9",
  upload: "M12 19V5m0 0-6 6m6-6 6 6",
  check: "m5 13 4 4L19 7",
  alert:
    "M12 9v4m0 4h.01M10.3 4.3 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0",
  chevronLeft: "m14 6-6 6 6 6",
  chevronRight: "m10 6 6 6-6 6",
  close: "M18 6 6 18M6 6l12 12",
  dot: "M12 12h.01",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  user: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  mail: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 .5 9 6 9-6",
  pencil: "M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16zM14 6l4 4",
} as const
