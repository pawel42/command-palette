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

A command either opens a page or runs an action, never both. Pages that need
props bind them at the call site with `page.with({ … })`, and `nav.push`
returns a promise that settles with whatever the page resolves — or `undefined`
if the user escaped out of it.

Hand-written pages use `definePage` plus the hooks in `react/`; `listPage` is
built from those same public hooks and does nothing they can't.

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
while the surface comes and goes is what makes the stack outlive a close.
