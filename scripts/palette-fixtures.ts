import { createPaletteStore } from "../components/command-palette/core/store"
import { bind } from "../components/command-palette/core/page/target"
import type {
  Command,
  Page,
  PaletteStore,
} from "../components/command-palette/core/index"

/**
 * Stub pages for the headless tests and the walkthrough script. Nothing here
 * is ever rendered, so the bodies are as empty as the engine lets them be —
 * a page is data, and what the stack does with it is all these exercise.
 */

export const rootPage: Page<{ commands: Command[] }> = {
  id: "root",
  title: "Root",
  placeholder: "Search commands…",
  render: () => null,
}

export const page1: Page = {
  id: "page1",
  title: "Page 1",
  placeholder: "Where to?",
  render: () => null,
}

export const page2: Page = { id: "page2", title: "Page 2", render: () => null }

export const page3: Page = { id: "page3", title: "Page 3", render: () => null }

export const page4: Page = { id: "page4", title: "Page 4", render: () => null }

export const page41: Page = {
  id: "page4.1",
  title: "Page 4.1",
  render: () => null,
}

/** A form: no input at all, so esc pops on the first press. */
export const formPage: Page = {
  id: "form",
  title: "Form",
  search: "disabled",
  render: () => null,
}

/** Deep page that jumps straight home on esc. */
export const confirmPage: Page = {
  id: "confirm",
  title: "Confirm",
  escape: "root",
  render: () => null,
}

/** Takes props and returns a value — the picker shape. */
export const projectsPage: Page<{ archived: boolean }, string> = {
  id: "projects",
  title: "Projects",
  render: () => null,
}

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

/**
 * Where these commands exist, and who they are for. The walkthrough drives the
 * engine with no UI attached and both rules are applied in `ui/`, so nothing
 * here depends on them — but both are required of every command there is,
 * which is the point: a command with nowhere to be, or nobody to be for, is a
 * command nobody can reach.
 */
const EVERYWHERE = ["/*"] as const
const ANYONE = ["*"] as const

export function createCommands(log: string[]): Command[] {
  return [
    {
      id: "page-1",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Page 1",
      section: "Pages",
      page: page1,
    },
    {
      id: "projects",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Search Projects",
      section: "Pages",
      keywords: ["client", "work"],
      page: bind(projectsPage, { archived: false }),
    },
    {
      id: "log",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Log The Query",
      section: "Actions",
      shortcut: ["Mod", "L"],
      run: ({ query }) => {
        log.push(`log:${query}`)
      },
    },
    {
      // The declared form: named outcomes, and `runAsync` never rejects.
      id: "sync",
      paths: EVERYWHERE,
      roles: ANYONE,
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
      // A failure with a side effect beyond the toast: `onError` lives on
      // `runAsync`'s own options, next to the messages, not on the command.
      id: "deploy",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Deploy a Preview",
      section: "Actions",
      run: ({ runAsync }) =>
        runAsync(
          async () => {
            await wait(20)
            throw new Error("The preview build failed")
          },
          {
            loading: "Deploying…",
            onError: (error) =>
              log.push(
                `caught:${error instanceof Error ? error.message : error}`
              ),
          }
        ),
    },
    {
      // Instant, and it has something to say: the pair of cases that broke
      // once — a toast from a quiet palette, and one that replaces a run.
      id: "copy",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Copy Link",
      section: "Actions",
      run: ({ toast }) => toast({ title: "Copied" }),
    },
    {
      // The one that asks to be the last thing in the palette — it has sent
      // the user somewhere the palette is in the way of.
      id: "go",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Go Somewhere Else",
      section: "Actions",
      run: ({ closePalette }) => {
        log.push("navigated")
        closePalette()
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
    rootPage: bind(rootPage, { commands }),
    onDismiss,
    revealMs: options.revealMs,
  })

  return { store, commands, log }
}
