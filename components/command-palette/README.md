# Command palette

A stacked, keyboard-driven command palette in one folder. Copy it in, no build
step, no package to install.

```
core/    the headless engine — pages, commands, the stack, the key rules
react/   the bindings: one provider and a handful of hooks, no markup
ui/      the rendered surface, including the ⌘K dialog host
```

Imports run one way only — `core → react → ui` — and never leave the folder.
The external imports anywhere in it are `react`, `next-intl` inside
`react/path.tsx`, and `radix-ui` inside `ui/dialog/`.

## What the host has to provide

1. **Tailwind v4 and the shadcn color tokens.** The markup uses
   `--popover`, `--popover-foreground`, `--accent`, `--accent-foreground`,
   `--border`, `--foreground`, `--muted-foreground`, `--primary` for the
   progress bar, `--destructive` for a failure, and `tw-animate-css`'s
   `animate-in` / `animate-out` utilities for the dialog. A shadcn project
   already has all of them.
2. **`data-app-shell` on whatever the palette should cover** — the dialog puts
   `inert` on it while open, which is how the app behind stops being focusable
   and stops being read by a screen reader. Pass `shellSelector` to
   `CommandPalette` to use a different marker.
3. **React 19.** `<Activity>` is what lets a page be hidden instead of
   unmounted, which is the whole reason the stack keeps its state.
4. **A next-intl routing config.** Every command says where it exists, so the
   palette has to know where the user is and what the places are. Both come
   from one `defineRouting({ pathnames })`: pass it as `routing`, and declare
   its keys once as the vocabulary rules are checked against. A host without
   next-intl passes `path` instead and gets the runtime half only. See "Where a
   command exists".

## Using it

```tsx
import { CommandPalette, ListPage } from "@/components/command-palette"
import type { Page } from "@/components/command-palette"

const settingsPage: Page = {
  id: "settings",
  title: "Settings",
  render: () => (
    <ListPage
      items={[
        {
          id: "theme",
          paths: ["/*"],
          title: "Toggle Dark Mode",
          run: () => toggleTheme(),
        },
      ]}
    />
  ),
}

// Commands, not a root page. The root is always the same page — one list over
// whatever it was handed — so the palette builds it and the host never writes
// it. Everything below the root is a page you do write.
const commands = [
  {
    id: "settings",
    // Where it exists. Required of every command — see below.
    paths: ["/*"],
    title: "Settings",
    section: "Pages",
    page: settingsPage,
  },
  {
    id: "save",
    paths: ["/documents/[id]"],
    title: "Save",
    section: "Actions",
    run: ({ query }) => save(query),
  },
]

export function App() {
  return (
    <CommandPalette
      commands={commands}
      routing={routing}
      placeholder="Search for a page or an action…"
    />
  )
}
```

The root takes the rest of its `ListPage`'s config the same way, as props:
`placeholder`, `emptyMessage`, `footer`, `note` and `watch`. The four it does
not take are the four that are not the host's at the root — `id` and `title`
are its own, `search` is the filter it opens on, and `escape` is `onDismiss`.

All of it is read once, when the palette mounts, because the page built from it
is the page the stack starts on and rebuilding that would remount the root.
Nothing is lost: the two seams below are what a changing root goes through, and
a page of your own is free to be built however you like.

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
props bind them at the call site with `bind(page, { … })`, and `nav.push`
returns a promise that settles with whatever the page resolves — or `undefined`
if the user escaped out of it.

## Where a command exists

A palette that spans an app is a palette whose rows are answerable to where the
user is. So every command says where it exists, and `paths` is required —
there is no default, because a default is the question going unasked:

```ts
paths: ["/*"] // everywhere there is
paths: ["/*", "!/admin/*"] // everywhere except the admin area
paths: ["/admin/*"] // /admin, and everything under it
paths: ["/admin/*", "!/admin/users"] // that subtree, less one page
paths: ["/settings"] // exactly one path
paths: ["/projects/[id]"] // one dynamic route: /projects/atlas
```

Four things to read off that:

**Nothing is available until a rule says so.** An empty list is a command
nobody can reach, which is why `"/*"` is written out rather than implied.

**`X/*` is the subtree, `X` included.** `"/admin/*"` covers `/admin` as well as
`/admin/users`, which is what makes `"/*"` mean every path by the same reading
rather than by a special case. It stops at a segment boundary, so it never
catches `/administrators`.

**The last rule that covers the path wins.** That is what lets a list read as a
general case and then its exceptions: `["/*", "!/admin/*"]` is everywhere-but,
and the same two the other way round are nowhere-but. A rule that covers
nothing is never consulted, so order only matters between rules that overlap.

**A dynamic segment is written the way the route is.** `"/projects/[id]"`
matches `/projects/atlas` and not `/projects`, because a dynamic segment still
has to be a segment; `"/docs/[...slug]"` takes the rest of the path.

Unavailable is _not there_, not greyed out. The row is out of the list, out of
the ⌘⇧K panel, and its shortcut does nothing — an unavailable command is one
the user has no business seeing, not one they should be told they cannot have.
There is no second check when it runs, because there is nothing left to run it
from.

### The pathnames are the router's, and they are checked

The rules above are not `string`. They are the keys of `routing.pathnames` —
the routes the router already knows — so `"/setttings"` is a compile error with
a "did you mean", rather than a command that quietly never appears:

```ts
// i18n/routing.ts — the app's routes, and what each is called in each locale
export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",
  pathnames: {
    "/": "/",
    "/projects": { en: "/projects", de: "/projekte" },
    "/projects/[id]": { en: "/projects/[id]", de: "/projekte/[id]" },
    "/admin": { en: "/admin", de: "/verwaltung" },
    "/admin/users": { en: "/admin/users", de: "/verwaltung/benutzer" },
    "/settings": { en: "/settings", de: "/einstellungen" },
  },
})

declare global {
  interface PaletteRoutes {
    path: keyof typeof routing.pathnames
  }
}
```

Derived, not written out, so there is no second list to keep in step: add a
route and it is a rule you can write, rename one and every rule that named it
stops compiling. Global rather than a module augmentation because there is no
import specifier to get subtly wrong, and getting one wrong would fail by
silently going back to unchecked strings. Declare nothing and that is exactly
what you get: `paths` takes any string, the folder still works, and there is
simply no vocabulary to check against.

Wildcards are derived, not free-form: `"/admin/*"` compiles because something
is declared at or under `/admin`, and `"/billing/*"` does not. `"/*"` always
compiles, and `"/*/users"` never does — a `*` is the tail of a rule or it is
nothing.

### Where the user is, the palette works out

The same config is the other half. `routing` is a prop on `CommandPalette`,
`InlinePalette` and `PaletteRoot`, and unlike the root config it is live —
the palette reads the pathname off the router on every render, because it moves:

```tsx
<CommandPalette commands={commands} routing={routing} … />
```

It asks next-intl, not `next/navigation`, and the difference is the whole
reason the config is what gets passed: `next/navigation` answers with the URL,
`/de/projekte/atlas`, and a rule can do nothing with that without knowing every
locale prefix and every translated segment. next-intl answers with the internal
pathname, `/projects/[id]` — which is exactly what a `paths` rule is written
in. One rule, every locale.

Inside the palette it is `useCurrentPath()`, so a page of your own can read
where it was opened without being handed anything. Query strings, hashes and a
trailing slash are trimmed off before anything is read against it.

A host with no next-intl to ask passes `path` instead — a plain string, worked
out however it likes. It wins over `routing`, and one of the two is required.

The rules are applied where the rows are, so they re-apply as the path moves:
navigate with the palette open and the list rebuilds under you, the action
panel with it. Commands are plain data and cannot call hooks, so a command that
navigates does it through a bridge, the same way one that toggles the theme
does.

`isAvailableOn(paths, path)` and `availableOn(items, path)` are exported for a
host that wants to ask the same question itself.

## Pages are objects

There is nothing to call. A page is a plain object with an `id` and a `render`
— a body of your own. A list is not a kind of page but a component: `ListPage`
is the filtered, keyboard-navigable list of commands, configured inside
`render` like any other body:

```tsx
const menuPage: Page = {
  id: "menu",
  title: "Menu",
  render: () => (
    <ListPage items={({ query }) => (query ? search(query) : recent())} />
  ),
}

const notesPage: Page = {
  id: "notes",
  title: "Notes",
  render: () => <Notes />,
}
```

`ListPage` takes the rest of the list's config the same way: `emptyMessage`, a
`note` rendered above the rows inside their scroll box, and `watch` for items
built from a store outside React.

`render` is **mounted** as a component, never called, so it keeps its own
hooks, its own state and its own effects — and it is handed the page's context
as props, which is why a body can be a plain function of it:

```tsx
const projectsPage: Page<{ archived: boolean }, Project> = {
  id: "projects",
  placeholder: "Search projects…",
  render: ({ props, resolve }) => (
    <Projects archived={props.archived} onPick={resolve} />
  ),
}

// opening it, from a command or from code
{ id: "projects", paths: ["/*"], title: "Projects", page: bind(projectsPage, { archived: false }) }
const project = await nav.push(projectsPage, { archived: false })
```

The two type parameters are what the caller must supply and what the page hands
back through `resolve`; both default to nothing, which is most pages. A page
that declares `Props` cannot be passed as a bare page target — `bind` is how it
gets opened, and the compiler will not let it be opened without one.

Anything nested deeper inside a body reaches the same context through the
hooks: `usePage(page)` for this instance's `props`, `query` and `resolve`, plus
`useNavigation`, `useSearch`, `useRunAsync`, `usePageFooter`.

`search` left out means `"filter"`: a palette page is a list unless it says
otherwise, and the frame cannot see inside `render` to tell. A page with
fields of its own says `search: "disabled"` — the same row, inert — because an
input that filters nothing is an invitation to type into nothing. Say
`search: "hidden"` to drop the input and let the title take its place, or
`"input"` for a body that owns the text.

A `ListPage`'s rows carry their section on the right, every one of them, with
the keys beside it wherever there are keys — the section on the outer edge, so
that column lines up down the list, and the ragged one inboard of it. They are
answers to different questions and neither stands in for the other: the section
says what the row is, which is what keeps a row readable once a list has
regrouped it under "Recent", and the keys say how to run it without coming back
here. The footer's action panel carries the keys alone, which are the point of
it. Nothing else rides along — a row that opens a page draws no chevron, and
there is no option to ask for one. Either way the shortcut still runs the
command: it is matched off the item, not off what was drawn.

A row is filed under its `section`, which is also what the right edge says.
A list can file one somewhere else — under "Recent", or all of them under
"Results" while the user types — by setting `group` on its way in. That is the
one field a `Command` does not have: the type a list takes is `ListCommand`,
which is a command plus the heading the list chose for it, so a registry is
never written with a `group` in it and a regrouped row keeps saying on its
right edge where it really lives.

Two seams exist for a list the host keeps outside React, and between them they
are a recents section:

```tsx
<CommandPalette
  // Idle, what was last used; typing, one ranked list under one heading.
  commands={({ query }) =>
    query.trim() ? commands.map(asResult) : [...recentRows(), ...commands]
  }
  // The root only subscribes to the palette's own state, so say what else to
  // watch — without this a write out there waits for the next keystroke.
  watch={{ subscribe: subscribeRecent, getSnapshot: recentIds }}
  // Every command the palette runs, as it runs. The host's window on what was
  // used: a command that opens a page has nowhere of its own to put that.
  onCommand={(c) => remember(c.id)}
/>
```

The function form runs on every render of the list, so it may read anything
outside React — a module store, a cache — and `watch` is what tells the list
when that moved. What it must not do is close over the host's React state: it
is captured with the page, once. Publish that state through `watch`, or through
a bridge, like anything else a command needs.

A row that appears twice needs an id of its own — the list keys its DOM ids and
its selection off `item.id`.

The palette is one fixed height, whatever page is on top and however far the
filter has cut the list down, so nothing reflows under the user mid-keystroke.
Pages get the space the input row and footer leave, and a page taller than that
scrolls inside it.

Scrolling answers ↑↓, PageUp/PageDown and Home/End with nothing declared: the
frame finds the scrolling box and applies the press itself. It has to, because
a browser only scrolls a box that is an ancestor of whatever holds focus — and
a page with no editable input leaves focus on the frame, which sits above the
box rather than inside it.

⌘ + arrow goes the whole way wherever it is pressed: to the end of a scrolling
page, or to the last row of a list that can be selected. ⌥ + arrow scrolls a
screenful, and belongs to scrolling only — in a list the arrows move one row at
a time and nothing else. Ctrl stands in for ⌘ off the Mac, as it does for the
⌘K that opens the palette.

## Keys are declared by name

A chord is written as key names, never as glyphs or as one platform's spelling:

```ts
shortcut: ["Mod", "Shift", "K"]
```

`Mod` is the key the platform runs commands with — ⌘ on a Mac, ctrl on Windows
and Linux — which is what lets one declaration match on both. `Shift`, `Alt`
and `Ctrl` mean exactly themselves everywhere, `Ctrl` included: reach for it
only when a chord really means control even on a Mac. The key itself is
`KeyboardEvent.key`'s own name, so `"K"`, `"Enter"`, `"ArrowUp"`, `"F2"`,
`"."` — with `"Space"` as the one exception, because a literal space is
unreadable in an array.

The type is `readonly [...Modifier[], KeyName]`: any number of modifiers, then
exactly one key. `["Mod", "Shift"]` is not a chord and `["K", "Mod"]` is
backwards, and both fail to compile rather than failing to fire. Modifier order
among themselves is free — `["Shift", "Mod", "K"]` is the same chord, and is
drawn the same way, because reading order is applied when it is drawn: ⇧⌘K on a
Mac, Ctrl Shift K everywhere else.

Nothing else has to be said anywhere. `Kbd` turns a name into whatever the
keyboard under the user prints on it, the footer hints take the same names
(`keys: ["Escape"]`), and `aria-keyshortcuts` is written from the same chord.

### More than one press

A shortcut can also be a run of presses — ⌘G, let go, then P:

```ts
shortcut: [["Mod", "G"], ["P"]]
```

Nesting is what tells the two apart: a flat list is one press, a list of lists
is several. At least two, because a sequence of one is a chord. The first press
must carry a modifier — the type insists — because opening a sequence swallows
the press after it, and a bare letter that did that would eat a character out
of every other word. After the lead, the keys are free: they are only read
while the palette is already waiting for them.

While it waits, the footer says which press it is holding and the next key
belongs to the palette rather than to whatever has focus. Esc gets out of it,
pressing the lead again starts it over, anything else abandons it, and it
expires on its own after `SEQUENCE_MS` — as it does when the page changes or
the palette closes, because a half-pressed sequence is not a thing to come
back to.

One rule worth knowing: a plain chord beats a sequence that starts with it. If
`["Mod", "G"]` runs something on its own, nothing beginning `[["Mod", "G"], …]`
will ever fire, because the chord has already run by the time the second press
arrives. Pick a lead that does nothing by itself.

## The header is the frame's; the footer is the page's

The input row is the same on every page: the search glyph at the root, the back
chevron everywhere else, then the one input. A page cannot change it, and that
is enforced rather than implied — `Page` types `icon`, `backIcon`, `header` and
friends as `never`, so a page that tries fails to compile whether it was
written as a literal or built by spreading. `search:
"hidden"` hides the _input_, not the row: the title takes its place and the way
back stays where the user left it.

What a page does get is the footer:

```tsx
const notesPage: Page = {
  id: "notes",
  title: "Notes",
  search: "hidden",
  footer: {
    hints: [{ keys: ["Escape"], label: "discards this draft" }],
    actions: [
      {
        id: "save",
        paths: ["/*"],
        title: "Save",
        shortcut: ["Mod", "Enter"],
        run: () => save(),
      },
      {
        id: "archive",
        paths: ["/*"],
        title: "Open the archive",
        page: archivePage,
      },
    ],
  },
  render: () => <Notes />,
}
```

`hints` are key legends with nothing behind them, drawn beside the frame's own.
`actions` are ordinary commands — the same shape as a list row, so they carry
`paths`, filter, group by `section` and open pages just as rows do. They live
behind **⌘⇧K**,
which opens a searchable panel at the footer's right; any that carry a
`shortcut` also fire straight from the page. A shortcut that is meant to work
while a form field has focus has to include `Mod` or `Ctrl`, or it would be
taken out of the middle of a word — and ⌘K and ⌘⇧K stay the palette's.

A footer that depends on the page's own React state cannot be declared on the
definition, so that page publishes it from inside instead:

```tsx
usePageFooter({
  actions: [
    {
      id: "density",
      paths: ["/*"],
      title: detailed ? "Compact" : "Detailed",
      run: toggle,
    },
  ],
})
```

Whoever declares the footer declares all of it: `usePageFooter` replaces the
page's config footer rather than adding to it, so there is only ever one place
to look. The config form is the default because it is read during render — a
footer published from an effect lands one frame after the page does.

## Work that takes a moment

A command that returns a promise is an async command, and returning it is the
whole declaration:

```tsx
{ id: "deploy", paths: ["/*"], title: "Deploy a Preview", run: () => api.deploy() }
```

While it runs, a bar sweeps under the input and the footer says what is
happening — a spinner, and **"Deploy a Preview…"**, taken from the row the user
pressed ↵ on. If it fails, the footer says that instead, in the error's own
words. Both belong to the frame, so a page never draws a spinner of its own,
and a command reports itself the same way whether it was taken from a row, from
the action panel, or from a chord. The input row is left alone throughout — it
is the same row on every page and in every state, which is the point of it.

Every run says what it is. A user made to wait is owed the reason, so `loading`
is required of `runAsync` — and a handler that merely returned a promise, like
the one above, has its command's own title used as the message. The key hints
stand down for the duration: they are always true and can be read at any other
moment, and while something is running that is the one thing the footer is for.

Nothing at all is shown for the first 120ms, from quiet: a bar that flashes for
two frames reads as a glitch, and a run that lands inside that window shows
only its outcome. Pass `revealMs` to move the line, or `0` to show the bar at
once.

To name the outcome, put the work through `runAsync`, which every command
context carries:

```tsx
run: ({ runAsync }) =>
  runAsync((signal) => api.sync({ signal }), {
    loading: "Syncing with remote…",
    success: (files) => `Synced ${files} files`,
    error: "Couldn't reach the remote",
  })
```

`loading` is the one that must be there. `success` and `error` are optional on
top of it: a silent success is a fair thing to want, and a failure falls back
to the error's own message.

`runAsync` never rejects. It resolves with the value, or with `undefined` once
it has shown the failure — so a caller checks for `undefined` instead of
catching. `success` and `error` take a string or a function of what came back,
and returning `null` from one says nothing at all. Omitting `error` shows the
error's own message, so a rejection is never silent to the _user_.

To the console it is, because catching the rejection is what stopped the
browser from logging it and putting a line there is not a palette's decision to
make. What the caught error gets is a way out:

```ts
runAsync(() => deploy(), {
  loading: "Deploying…",
  onError: console.error,
})
```

`onError` is handed the failure the palette swallowed, after the user has been
shown it — `console.error` to get the old browser behavior back, or a reporter,
or nothing. It sits on the run rather than on the palette, because whether a
handled failure deserves a line in the console belongs to whoever wrote the
command and not to the host that mounted the thing.

A page's own code — a button, an effect, a hook it keeps its behavior in —
reaches the same thing with `useRunAsync()`, so work started inside a page is
reported exactly like a command's:

```tsx
const runAsync = useRunAsync()

const save = async () => {
  const task = await runAsync((signal) => api.save(draft, signal), {
    loading: "Saving…",
  })
  // undefined: it failed and has said so, or it was called off. Either way it
  // did not happen, so the form stays where it is.
  if (task) nav.popToRoot()
}
```

## One run at a time

The palette runs one thing, and the next one calls off the first. Picking any
other command does it — an instant one counts, since one command at a time is
one command at a time whether or not the new one takes any — and so does going
anywhere: a push, a pop, a page resolving, an `esc` that unwinds, the idle
reset. All of them abort the run in flight:

- the signal handed to the work fires, so a `fetch` really is cancelled;
- the bar goes and the loading toast with it, at once, rather than whenever the
  work notices;
- `runAsync` resolves `undefined` immediately, and **says nothing** — a user
  who has moved on does not need a toast about what they left behind.

The handover is instant in both directions. Starting a run clears the footer —
the old run's "Syncing…", and equally a "Synced 12 files" still sitting out its
two and a half seconds — and the new run puts its own bar and message up with
no reveal delay, because the delay is there to keep a _quiet_ palette from
flashing and this one was already speaking. So there is never a moment where
the footer is describing the command before last.

That is what makes `undefined` the one thing to check for: it means _this
didn't happen_, whether it failed or was abandoned. The alternative is a bar
running over a page that never asked for one, and an outcome landing three
pages later where it means nothing.

Typing and moving the selection are not commands and not navigation — a run
survives the user searching around it.

Closing the palette is not navigation either: the work carries on, and the bar
is still there on the next ⌘K. What a closed palette does stop is the clock on
its messages — a toast's 2.5 seconds are seconds to read it in, and they are
not spent while nobody can see it. So a run that lands after you close lands in
a footer that waits: reopen a minute later and "Synced 12 files" is still
there, starting its time from the moment you come back. The idle reset ends
that — 30 seconds closed calls off anything still running and clears the
footer, because a palette starting over starts over.

Only `runAsync`'s function form can be cut short for real, because only it is
handed a signal. A bare `run: () => api.deploy()` still stops being reported
the moment the user leaves — but nothing tells the request itself, so take the
signal for anything worth aborting.

`ctx.toast({ title, message })` and `useToast()` say the same line with no work
behind it. There is one toast at a time and the newest replaces it — the footer
has one line for it, and a stack of them would be a second thing to dismiss on
the way out. A success clears itself after 2.5s and a failure after 5s.

Two promises are deliberately not treated as work: `nav.push(…)`, which stays
pending for as long as the pushed page is open, and anything already handed to
`runAsync`. Both are marked at the source — see `core/async.ts`.

## Forms

A form is a page whose body is yours, so there is nothing to configure and no
field to register — react-hook-form, TanStack Form and plain `useState` all
work in `render` untouched. Two things are not the form library's to settle,
though, and both are here:

```tsx
const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues })

const { formProps } = useFormPage(form, {
  title: "Create the issue",
  loading: "Creating the issue…",
  success: (issue) => `Created ${issue.key}`,
  submit: (values, signal) => api.createIssue(values, signal),
  done: () => nav.popToRoot(),
})

return <div {...formProps}>{/* fields, and no button */}</div>
```

**The submit is ⌘↵ and a footer row, never a button.** The user got here by
typing and the footer is already spelling the chord out, so a primary button
at the bottom of a form says the same thing a second time — and costs a tab
stop and a row of the vertical space a palette does not have. `submit` may
take a signal and return a promise, which puts it through `runAsync` and gets
the bar and the toast; `loading` is required there for the usual reason. Leave
`loading` out and the submit is just called — `resolve(values)` for a page that
hands its values back rather than saving them.

An invalid form cannot submit, because `handleSubmit` only calls the work when
the values are good. Nothing is said about it in the footer: the fields have
already said it where the problem is, and the form library puts focus on the
first one that failed. `done` is the other half of the same idea — it runs only
if the work really landed, so a failed save leaves the user on the form with
everything still in it.

`formProps` is not decoration. Radix's checkbox and radio call
`preventDefault()` on _every_ enter, modifiers included — WAI-ARIA says a
checkbox does not activate on enter, and they are right — and the frame stands
down on anything already prevented, which is the rule that lets a widget own
its own keys. Both are good rules, and together they mean ⌘↵ silently stops
working the moment focus lands on a checkbox. `formProps` reads the chord in
the capture phase, on the way down, before anything can prevent it.

`useFormPage` imports no form library: it takes anything shaped like
`SubmittableForm`, which react-hook-form's `UseFormReturn` already is. The rule
at the top of this file still holds — react and radix-ui, and nothing else.

### An overlay in a page owns the esc that closes it

```tsx
<SelectContent {...claimsEscape}>
```

Without it one press does two things. Radix's `DismissableLayer` listens for
esc on the document in the _capture_ phase and only on the topmost layer, so
the open dropdown closes itself first; the press then carries on to the frame,
which reads esc before its own `defaultPrevented` guard — deliberately, because
the palette's own dialog has already marked the event by then. So the menu
shuts _and_ the page unwinds, and the user loses a form they only meant to
close a menu on. `claimsEscape` claims the press for the overlay; `claimEscape`
is exported for anything else that has to do the same.

## Composing it yourself

`CommandPalette` is one opinionated host: the ⌘K dialog. `InlinePalette` is
the same palette with nothing around it, for a host that brings its own
container. For any other presentation, delete `ui/dialog/` and compose the two
halves directly:

```tsx
<PaletteRoot commands={commands} onDismiss={close}>
  {/* bridges that publish hook-only values to commands live here */}
  {open && <PaletteSurface />}
</PaletteRoot>
```

`PaletteRoot` takes the root exactly as the dialog does — it is where the
dialog passes it on to. Either way the root is one list over the commands: it
is the single page a host does not write.

`PaletteRoot` holds all the state and renders nothing, so keeping it mounted
while the surface comes and goes is what makes the stack outlive a close. Drop
`useIdleReset(open)` into a component inside it to keep the timed reset, or
call `nav.reset()` on whatever schedule suits the host.

A host that _hides_ the surface instead of unmounting it — as `ui/dialog/` does,
so every page keeps its scroll and its caret — passes `revealId` and bumps it on
every reveal. That is the only thing telling the frame it is being shown again,
and it is what puts the caret back in the input.
