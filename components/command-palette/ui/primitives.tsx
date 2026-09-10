/** Presentational pieces shared by the frame and the built-in pages. */

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
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
  chevronLeft: "m14 6-6 6 6 6",
  chevronRight: "m10 6 6 6-6 6",
  close: "M18 6 6 18M6 6l12 12",
  dot: "M12 12h.01",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  user: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  mail: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 .5 9 6 9-6",
} as const
