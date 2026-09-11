# Command palette

A stacked, keyboard-driven command palette in one folder. Copy it in, no build
step, no package to install.

```
core/    the headless engine — pages, commands, the stack, the key rules
react/   the bindings: one provider and a handful of hooks, no markup
ui/      the rendered surface, including the ⌘K dialog host
```

Imports run one way only — `core → react → ui` — and never leave the folder.
The only external imports anywhere in it are `react` and, inside `ui/dialog/`,
`radix-ui`.

## What the host has to provide

1. **Tailwind v4 and the shadcn color tokens.** The markup uses
   `--popover`, `--popover-foreground`, `--accent`, `--accent-foreground`,
   `--border`, `--foreground`, `--muted-foreground`, and `tw-animate-css`'s
   `animate-in` / `animate-out` utilities for the dialog. A shadcn project
   already has all of them.
2. **`data-app-shell` on whatever the palette should cover** — the dialog puts
   `inert` on it while open, which is how the app behind stops being focusable
   and stops being read by a screen reader. Pass `shellSelector` to
   `CommandPaletteDialog` to use a different marker.
3. **React 19.** `<Activity>` is what lets a page be hidden instead of
   unmounted, which is the whole reason the stack keeps its state.

## Using it

```tsx
import { CommandPaletteDialog, listPage } from "@/components/command-palette"

const settingsPage = listPage({
  id: "settings",
  title: "Settings",
  items: [{ id: "theme", title: "Toggle Dark Mode", run: () => toggleTheme() }],
})

// The root is a list page over your commands — not a special case.
const rootPage = listPage({
  id: "root",
  placeholder: "Search for a page or an action…",
  items: [
    { id: "settings", title: "Settings", section: "Pages", page: settingsPage },
    {
      id: "save",
      title: "Save",
      section: "Actions",
      run: ({ query }) => save(query),
    },
  ],
})

export function App() {
  return <CommandPaletteDialog rootPage={rootPage} />
}
```

A closed palette keeps the user's place — the same stack, page state, text and
scroll are there on the next ⌘K — but only for a while: after 30 seconds
closed, `nav.reset()` starts it over, so reopening much later lands on a clean
root rather than on some half-finished page. Reset drops every page above the
root and remounts the root itself, which is what also clears page state and
the list's scroll offset; an ordinary close still restores all of it. A
palette closed on an untouched root is left alone — no remount, no state
change — so the timer is free in the case it fires in most often. Pass
`idleResetMs` to change the delay, or `0` to keep the stack forever.

A command either opens a page or runs an action, never both. Pages that need
props bind them at the call site with `page.with({ … })`, and `nav.push`
returns a promise that settles with whatever the page resolves — or `undefined`
if the user escaped out of it.

Hand-written pages use `definePage` plus the hooks in `react/`; `listPage` is
built from those same public hooks and does nothing they can't.

The palette is one fixed height, whatever page is on top and however far the
filter has cut the list down, so nothing reflows under the user mid-keystroke.
Pages get the space the input row and footer leave, and a page taller than that
scrolls inside it.

Scrolling answers ↑↓, PageUp/PageDown and Home/End with nothing declared: the
frame finds the scrolling box and applies the press itself. It has to, because
a browser only scrolls a box that is an ancestor of whatever holds focus — and
a page with no input row leaves focus on the frame, which sits above the box
rather than inside it.

⌘ + arrow goes the whole way wherever it is pressed: to the end of a scrolling
page, or to the last row of a list that can be selected. ⌥ + arrow scrolls a
screenful, and belongs to scrolling only — in a list the arrows move one row at
a time and nothing else. Ctrl stands in for ⌘ off the Mac, as it does for the
⌘K that opens the palette.

## Composing it yourself

`CommandPaletteDialog` is one opinionated host. For any other presentation,
delete `ui/dialog/` and compose the two halves directly:

```tsx
<PaletteRoot rootPage={rootPage} onDismiss={close}>
  {/* bridges that publish hook-only values to commands live here */}
  {open && <PaletteSurface />}
</PaletteRoot>
```

`PaletteRoot` holds all the state and renders nothing, so keeping it mounted
while the surface comes and goes is what makes the stack outlive a close. Drop
`useIdleReset(open)` into a component inside it to keep the timed reset, or
call `nav.reset()` on whatever schedule suits the host.

A host that _hides_ the surface instead of unmounting it — as `ui/dialog/` does,
so every page keeps its scroll and its caret — passes `revealId` and bumps it on
every reveal. That is the only thing telling the frame it is being shown again,
and it is what puts the caret back in the input.
