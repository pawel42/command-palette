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

/**
 * Work that takes a beat, so a walkthrough can watch the bar come and go —
 * and that gives up when its signal says to, the way `fetch` does.
 */
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
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
      // The declared form: named outcomes, and `runAsync` never rejects.
      id: "sync",
      title: "Sync With Remote",
      section: "Actions",
      run: ({ runAsync }) =>
        runAsync(
          async (signal) => {
            signal.addEventListener("abort", () => log.push("sync:aborted"))
            await wait(20, signal)
            return 12
          },
          {
            loading: "Syncing…",
            success: (files) => `Synced ${files} files`,
            error: "Couldn't reach the remote",
          }
        ),
    },
    {
      // The zero-config form: a bare async handler that throws. The store
      // tracks it because it returned a promise, and nothing else was said.
      id: "deploy",
      title: "Deploy a Preview",
      section: "Actions",
      run: async () => {
        await wait(20)
        throw new Error("The preview build failed")
      },
      // Nothing is logged for you: the command says what its failure deserves.
      onError: (error) =>
        log.push(`caught:${error instanceof Error ? error.message : error}`),
    },
    {
      // Instant, and it has something to say: the pair of cases that broke
      // once — a toast from a quiet palette, and one that replaces a run.
      id: "copy",
      title: "Copy Link",
      section: "Actions",
      run: ({ toast }) => toast({ title: "Copied" }),
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

export function createTestStore(
  onDismiss?: () => void,
  options: { revealMs?: number } = {}
): {
  store: PaletteStore
  commands: Command[]
  log: string[]
} {
  const log: string[] = []
  const commands = createCommands(log)
  const store = createPaletteStore({
    rootPage: rootPage.with({ commands }),
    onDismiss,
    revealMs: options.revealMs,
  })

  return { store, commands, log }
}
