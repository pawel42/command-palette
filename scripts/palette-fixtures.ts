import { definePage } from "../components/command-palette/core/page/define"
import { createPaletteStore } from "../components/command-palette/core/store"
import type {
  Command,
  PaletteStore,
} from "../components/command-palette/core/index"

/**
 * Stub pages for the headless tests and the walkthrough script. `component` is
 * opaque to the engine, so null is a perfectly good page here.
 */

export const rootPage = definePage<{ commands: Command[] }, void, null>({
  id: "root",
  title: "Root",
  placeholder: "Search commands…",
  component: null,
})

export const page1 = definePage<void, void, null>({
  id: "page1",
  title: "Page 1",
  placeholder: "Where to?",
  component: null,
})

export const page2 = definePage<void, void, null>({
  id: "page2",
  title: "Page 2",
  component: null,
})

export const page3 = definePage<void, void, null>({
  id: "page3",
  title: "Page 3",
  component: null,
})

export const page4 = definePage<void, void, null>({
  id: "page4",
  title: "Page 4",
  component: null,
})

export const page41 = definePage<void, void, null>({
  id: "page4.1",
  title: "Page 4.1",
  component: null,
})

/** A form: the input is inert, so esc pops on the first press. */
export const formPage = definePage<void, void, null>({
  id: "form",
  title: "Form",
  search: "disabled",
  component: null,
})

/** Deep page that jumps straight home on esc. */
export const confirmPage = definePage<void, void, null>({
  id: "confirm",
  title: "Confirm",
  escape: "root",
  component: null,
})

/** Takes props and returns a value — the picker shape. */
export const projectsPage = definePage<{ archived: boolean }, string, null>({
  id: "projects",
  title: "Projects",
  component: null,
})

export function createCommands(log: string[]): Command[] {
  return [
    { id: "page-1", title: "Page 1", section: "Pages", page: page1 },
    {
      id: "projects",
      title: "Search Projects",
      section: "Pages",
      keywords: ["client", "work"],
      page: projectsPage.with({ archived: false }),
    },
    {
      id: "log",
      title: "Log The Query",
      section: "Actions",
      shortcut: ["⌘", "L"],
      run: ({ query }) => {
        log.push(`log:${query}`)
      },
    },
    {
      id: "blocked",
      title: "Push to Remote",
      section: "Actions",
      subtitle: "nothing to push",
      disabled: true,
      run: () => {
        log.push("should not run")
      },
    },
  ]
}

export function createTestStore(onDismiss?: () => void): {
  store: PaletteStore
  commands: Command[]
  log: string[]
} {
  const log: string[] = []
  const commands = createCommands(log)
  const store = createPaletteStore({
    rootPage: rootPage.with({ commands }),
    onDismiss,
  })

  return { store, commands, log }
}
