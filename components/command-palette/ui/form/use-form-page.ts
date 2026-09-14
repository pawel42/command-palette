"use client"

import { useCallback, useEffect, useRef } from "react"

import { isSequence, matchesShortcut } from "../../core"
import type {
  Command,
  FooterHint,
  PathPattern,
  Shortcut,
  ToastMessage,
} from "../../core"
import { useRunAsync } from "../../react"
import { usePageFooter } from "../frame"

/**
 * A form page's submit, wired the way every palette form should be: ⌘↵, the
 * frame's progress bar, and no button anywhere in the body.
 *
 * The button is the thing this exists to remove. A palette is a keyboard
 * surface — the user got here by typing, and the footer is already spelling
 * out the chord — so a primary button at the bottom of a form is a second
 * affordance for something the page has already said, and the one that costs
 * a tab stop and a row of the vertical space the palette does not have. What
 * replaces it is a footer action: searchable in ⌘⇧K, drawn with its own
 * chord, answerable to `paths` like every other command.
 *
 * Validation is the form library's, untouched. `handleSubmit` calls the work
 * only when the values are good, so an invalid form cannot submit — and
 * nothing is said about it here, because the fields have already said it
 * where the problem is. A toast would be the same sentence in the one place
 * the user is not looking.
 */

/** Everywhere — a footer action on a page the user is already standing on. */
const HERE = ["/*"] as const satisfies readonly PathPattern[]

/** ⌘↵ on a Mac, ctrl+↵ everywhere else. */
const DEFAULT_SHORTCUT: Shortcut = ["Mod", "Enter"]

/**
 * The whole of what this needs from a form library, written out rather than
 * imported.
 *
 * react-hook-form's `UseFormReturn` satisfies it as it stands — pass one
 * straight in — and so does anything else shaped like it. Structural on
 * purpose: this folder is copied whole and imports nothing but React, and a
 * `import type { UseFormReturn }` would be enough to stop it compiling in a
 * project that has no form library at all. The palette has no opinion about
 * where a form keeps its values; it only needs to be told when they are good.
 */
export type SubmittableForm<Values> = {
  handleSubmit: (onValid: (values: Values) => unknown) => () => Promise<unknown>
}

/** What ⌘↵ does when there is real work behind it. */
type AsyncSubmit<Values, Result> = {
  /**
   * What the footer says while it runs. Required for the same reason
   * `runAsync` requires it: a user made to wait is owed the reason.
   */
  loading: string
  submit: (values: Values, signal: AbortSignal) => Promise<Result>
  /** Omitted is a silent success — the bar goes and nothing replaces it. */
  success?: ToastMessage<Result>
  /** Omitted is the error's own message. */
  error?: ToastMessage<unknown>
  /**
   * After it lands, and only if it really landed. Not called when the work
   * failed or was called off — this is where `nav.popToRoot()` goes, so a
   * failed save leaves the user on the form with their values still in it.
   */
  done?: (result: Result) => void
}

/** What ⌘↵ does when there is nothing to wait for — `resolve(values)`, say. */
type SyncSubmit<Values> = {
  loading?: never
  submit: (values: Values) => void
}

type Common = {
  /** The footer row's own label. Defaults to "Submit". */
  title?: string
  /** Defaults to ⌘↵. Whatever this is, it has to carry `Mod` — see below. */
  shortcut?: Shortcut
  icon?: React.ReactNode
  /**
   * The page's other actions and hints. They go here rather than in a second
   * `usePageFooter` call because a footer is declared all at once — whoever
   * declares it declares all of it.
   */
  actions?: readonly Command[]
  hints?: readonly FooterHint[]
}

export type FormPageOptions<Values, Result> = Common &
  (AsyncSubmit<Values, Result> | SyncSubmit<Values>)

export type FormPageHandle = {
  /** The submit press, for a page that wants to fire it from somewhere else. */
  submit: () => void
  /**
   * Spread on whatever element the fields live in. Not optional in practice —
   * see the capture handler below for the collision it exists to settle.
   */
  formProps: {
    onKeyDownCapture: (event: React.KeyboardEvent) => void
  }
}

export function useFormPage<Values, Result>(
  form: SubmittableForm<Values>,
  options: Common & AsyncSubmit<Values, Result>
): FormPageHandle
export function useFormPage<Values>(
  form: SubmittableForm<Values>,
  options: Common & SyncSubmit<Values>
): FormPageHandle
/**
 * Two overloads rather than one signature over the union: `Result` is only
 * mentioned inside one arm of it, and inference through a union arm falls
 * back to the default instead of reading `submit`'s return type — which would
 * quietly type every `success` and `done` as taking `void`.
 */
export function useFormPage<Values, Result>(
  form: SubmittableForm<Values>,
  options: FormPageOptions<Values, Result>
): FormPageHandle {
  const runAsync = useRunAsync()

  // Read through a ref, not a dependency: the options are an object literal
  // built fresh on every render, and the handlers in it close over this
  // render's state. A memo keyed on them would rebuild every time anyway, and
  // one that wasn't would submit with values from an older render.
  //
  // Handed over in an effect with no dependency array, the way the bridge
  // publishes a key handler — writing a ref during render is the one thing
  // that would make this unsafe, and a press cannot arrive before the effects
  // of the render it was drawn on have run.
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  const submit = useCallback(() => {
    const run = form.handleSubmit(async (values) => {
      const current = latest.current

      if (current.loading === undefined) {
        current.submit(values)
        return
      }

      const { loading, submit, success, error, done } = current

      // Wrapped, so "it didn't happen" is never confused with "it happened
      // and returned nothing". `runAsync` resolves `undefined` for a failure
      // and for a run that was called off, and a submit whose own result is
      // `void` would be indistinguishable from either.
      const landed = await runAsync(
        async (signal) => ({ value: await submit(values, signal) }),
        {
          loading,
          success:
            typeof success === "function"
              ? (wrapped) => success(wrapped.value)
              : success,
          error,
        }
      )

      if (!landed) return
      done?.(landed.value)
    })

    // Discarded on purpose: a handler that returned this promise would hand
    // the palette a *second* piece of work to report, on top of the one
    // `runAsync` is already drawing a bar for.
    void run()
  }, [form, runAsync])

  /**
   * The submit chord, read on the way *down* to the field the user is in.
   *
   * Capture rather than bubble because of a collision neither side is wrong
   * about. Radix's checkbox and radio both do this:
   *
   *   onKeyDown: (event) => { if (event.key === "Enter") event.preventDefault() }
   *
   * WAI-ARIA says a checkbox does not activate on enter, and they are right.
   * But the check never looks at the modifiers, so it swallows ⌘↵ along with
   * the bare press — and the frame stands down on anything already
   * `defaultPrevented`, which is the rule that lets a widget own its own keys.
   * Both are good rules. Together they mean a form whose submit quietly stops
   * working the moment focus lands on a checkbox, with nothing to say why.
   *
   * Capture runs before the target's own handler, so the chord is taken before
   * anything can prevent it. Preventing it here in turn is what stops the
   * frame running the same action a second time on the way back up.
   */
  const onKeyDownCapture = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.repeat) return

      const shortcut = latest.current.shortcut ?? DEFAULT_SHORTCUT
      // A sequence is held by the frame across two presses; there is nothing
      // here for one press to match.
      if (isSequence(shortcut)) return
      if (!matchesShortcut(shortcut, event.nativeEvent)) return

      event.preventDefault()
      submit()
    },
    [submit]
  )

  usePageFooter({
    actions: [
      {
        id: "submit",
        paths: HERE,
        title: options.title ?? "Submit",
        // ⌘ is not decoration here: a bare chord would be taken out of the
        // middle of whatever the user is typing into.
        shortcut: options.shortcut ?? DEFAULT_SHORTCUT,
        icon: options.icon,
        run: submit,
      },
      ...(options.actions ?? []),
    ],
    hints: options.hints ?? [{ keys: ["Escape"], label: "discards this form" }],
  })

  return { submit, formProps: { onKeyDownCapture } }
}
