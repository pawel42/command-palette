"use client"

import { useState } from "react"
import { Dialog, VisuallyHidden } from "radix-ui"

import { CommandPalette } from "./command-palette"
import { useToggleHotkey } from "./use-toggle-hotkey"

/**
 * The palette in a Radix dialog, toggled globally with ⌘K.
 *
 * Two things are deliberate:
 *  - `onEscapeKeyDown` is prevented, because Radix listens for esc in the
 *    capture phase and would close on the first press. Esc has to clear the
 *    input and unwind the stack first, so the palette decides instead and the
 *    dialog closes through `onDismiss` — esc at the root with an empty input.
 *  - the palette lives inside the content, so closing unmounts it and every
 *    open starts at the root. Hoist `CommandPalette` above `Dialog.Root` (with
 *    `forceMount`) if you'd rather resume where the user left off.
 */
export function CommandPaletteDialog() {
  const [open, setOpen] = useState(false)

  useToggleHotkey(() => setOpen((previous) => !previous))

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />

        <Dialog.Content
          onEscapeKeyDown={(event) => event.preventDefault()}
          aria-describedby={undefined}
          className="fixed top-[20vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>Command palette</Dialog.Title>
          </VisuallyHidden.Root>

          <CommandPalette onDismiss={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
