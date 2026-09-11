"use client"

import type { Toast } from "../../core"
import { FOOTER_ENTER, ICONS, Icon } from "../primitives"

/**
 * What the frame draws for work in flight: the bar under the input, and the
 * spinner and message in the footer. Both read from one snapshot — see
 * `core/async.ts`.
 *
 * Neither takes any space. The bar is laid over the input row's bottom edge
 * and the footer's status stands where the key hints were, so a palette with
 * something happening in it is exactly as tall as one without, and the page
 * never moves. The input row itself is left alone: it is the same row on every
 * page and in every state, which is the point of it.
 *
 * The split: the bar and the spinner are drawn for every run, because that
 * something is happening is the palette's to say and not the command's to
 * remember. The words are the command's, and they are optional — most work
 * needs none, only the fact that it is running.
 */

/**
 * An indeterminate sweep: the work has no percentage to report, and inventing
 * one is a lie the user finds out about at the end.
 *
 * The keyframes are here rather than in the host's stylesheet because this
 * folder is meant to be copied in whole. React hoists a `<style>` with a
 * `precedence` into the head and dedupes it by `href`, so mounting the bar
 * repeatedly costs one rule, once.
 */
const SWEEP = `@keyframes command-palette-sweep {
  0%   { transform: translateX(-100%) }
  100% { transform: translateX(400%) }
}`

export function ProgressBar() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
    >
      <style href="command-palette-sweep" precedence="medium">
        {SWEEP}
      </style>

      {/* A quarter of the track, travelling its own width four times over:
          starts fully off the left edge, ends fully off the right. */}
      <div className="h-full w-1/4 [animation:command-palette-sweep_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  )
}

/**
 * The footer's mark for work in flight, shown for the whole of every run —
 * with a message beside it when the command gave one, and on its own when it
 * did not. Either way the key hints stand down while it turns: that a command
 * is working is the one thing the footer has to say while one is.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={`animate-spin ${className ?? "size-4 shrink-0"}`}
    >
      <circle cx="12" cy="12" r="9" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  )
}

/**
 * The mark in front of a footer message: the spinner while the work runs, then
 * the outcome it turned into. A loading message draws its own rather than
 * sitting beside the frame's, so the spinner stays in one place as the message
 * arrives and leaves — see the footer in `frame.tsx`.
 */
function ToastIcon({ kind }: { kind: Toast["kind"] }) {
  if (kind === "loading") return <Spinner className="size-3.5 shrink-0" />

  return (
    <Icon
      path={kind === "error" ? ICONS.alert : ICONS.check}
      className="size-3.5 shrink-0"
    />
  )
}

/**
 * The outcome, in the footer's left half. It replaces the key hints rather
 * than joining them: the hints are always true and can be re-read at any time,
 * and for the couple of seconds this is up it is the more interesting of the
 * two. The action panel's trigger keeps its place on the right throughout.
 *
 * Announced as it appears — while the palette is open the rest of the app is
 * `inert`, so this is the only thing a screen reader has left to hear.
 */
export function FrameToast({ toast }: { toast: Toast }) {
  const isError = toast.kind === "error"

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={[
        "flex min-w-0 flex-1 items-center gap-2",
        FOOTER_ENTER,
        isError ? "text-destructive" : "text-foreground",
      ].join(" ")}
    >
      <ToastIcon kind={toast.kind} />

      <span className="truncate font-medium">{toast.title}</span>

      {toast.message && (
        <span className="truncate text-muted-foreground">{toast.message}</span>
      )}
    </div>
  )
}
