/**
 * Drives the engine with no UI attached, printing the stack after every step.
 * Run with: npm run walkthrough
 */
import {
  confirmPage,
  createTestStore,
  page2,
  page3,
  page4,
} from "./palette-fixtures"
import { isAvailableOn } from "../components/command-palette/core/routes"
import type { PathPattern } from "../components/command-palette/core/routes"
import type { PaletteStore } from "../components/command-palette/core/store"

const { store, commands, log } = createTestStore(() => log.push("dismissed"))

function show(store: PaletteStore, step: string) {
  const { stack } = store.getState()
  const path = stack
    .map((instance) => {
      const title = instance.page.title ?? instance.page.id
      return instance.query ? `${title}("${instance.query}")` : title
    })
    .join(" › ")

  console.log(`${step.padEnd(34)} ${path}`)
}

show(store, "start")

store.runCommand(commands.find((command) => command.id === "log")!)
show(store, "run action command")

// Two commands, two endings. An action leaves the palette where it is, which
// is why the stack above is untouched; this one closes it — the only way to
// close short of esc at the root — and the stack is untouched by that too,
// because a closed palette keeps the user's place.
store.runCommand(commands.find((command) => command.id === "go")!)
show(store, "run a command that closes")

store.runCommand(commands.find((command) => command.id === "page-1")!)
show(store, "open page1")

for (const branch of [page2, page3, page4]) {
  void store.navigation.push(branch)
  show(store, `branch to ${branch.id}`)
  store.escape()
  show(store, "esc back to page1")
}

store.navigation.setQuery("typed into page1")
show(store, "type into page1")
store.escape()
show(store, "esc clears the input")

void store.navigation.push(page2)
void store.navigation.push(page3)
void store.navigation.push(confirmPage)
show(store, "three deep, ending in confirm")

store.escape()
show(store, 'esc with route "root"')

store.escape()
show(store, "esc at the root dismisses")

void store.navigation.push(page2)
store.navigation.setQuery("left mid-flow")
show(store, "closed here, one page deep")
store.navigation.reset()
show(store, "idle reset while closed")

console.log("\nside effects:", log)

/* ------------------------------------------------------------------ async */

/**
 * What the frame would be drawing, one line per moment: the bar under the
 * input, and the one toast in the footer. `revealMs: 0` skips the delay that
 * keeps a fast run from flashing — there is nothing to look at here.
 */
const {
  store: palette,
  commands: asyncCommands,
  log: ran,
} = createTestStore(undefined, { revealMs: 0 })

const run = (id: string) =>
  palette.runCommand(asyncCommands.find((command) => command.id === id)!)

function status(step: string) {
  const { busy, toast } = palette.tasks.getSnapshot()
  const said = toast ? `${toast.kind}: ${toast.title}` : "—"
  console.log(`${step.padEnd(34)} bar ${busy ? "on " : "off"}   ${said}`)
}

/** Long enough for a settled promise's handlers to have run. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 40))

console.log("")
status("idle")

const first = run("sync")
status("run an async command")

await first
status("it landed")

// One at a time: starting anything cancels what was running.
const cancelled = run("sync")
status("run it again")
const replacing = run("deploy")
status("start another before it lands")

console.log(`  the first resolved with: ${await cancelled}`)
await replacing
await tick()
status("only the second one speaks")

// An instant command speaks from a quiet palette, with no run anywhere near it
// — the case that broke, because "clear the old message" cleared the new one.
palette.tasks.dismissToast()
status("nothing happening")
run("copy")
status("instant command, from quiet")
palette.tasks.dismissToast()

// A command that does its work there and then replaces a run just the same.
const dropped = run("sync")
status("run one that takes a while")
run("log")
status("then pick an instant one")
console.log(`  the run resolved with: ${await dropped}`)

// The same, with a message of its own: the run's is replaced, not its own.
const traded = run("sync")
status("run another")
run("copy")
status("then an instant one that speaks")
console.log(`  that run resolved with: ${await traded}`)
palette.tasks.dismissToast()

// And so does leaving the page the work was started from.
const abandoned = run("sync")
status("run one more")
void palette.navigation.push(page2)
status("push a page over it")

console.log(`  it resolved with: ${await abandoned}`)
await tick()
status("nothing was said about it")

console.log("\nwhat the commands did about it:", ran)

/* ------------------------------------------------------------ except itself */

/**
 * The one run a command cannot replace is its own. "One run at a time" answers
 * a user who has changed their mind, and the same row pressed twice is not
 * that — so the second press does nothing at all, quietly: the palette is
 * already saying the one true thing there is to say about this command.
 */
console.log("")
palette.tasks.dismissToast()
status("idle again")

const own = run("sync")
const second = run("sync")
console.log(
  `  pressed again:       ${second === undefined ? "nothing ran" : "ran"}`
)
console.log(
  `  the first one landed with: ${await own}   (12 = it was never cut short)`
)
await tick()
status("one press, one run")

// A different command is a change of mind, and still takes the run's place.
const replaced = run("sync")
run("deploy")
console.log(
  `\n  then a different command: the sync resolved with ${await replaced}`
)
await tick()
status("the one that replaced it")

/* ----------------------------------------------------------------- routes */

/**
 * Where a command exists. Pure `core/`, so it is exercised here rather than
 * through the UI that applies it: one table of rules against one table of
 * paths, and the answer each pair should give.
 */
const RULES: Array<[readonly string[], string, boolean]> = [
  // Nothing at all is available by default.
  [[], "/", false],
  [[], "/admin", false],

  // The one rule that means everywhere.
  [["/*"], "/", true],
  [["/*"], "/admin/users/roles", true],

  // A subtree covers its own base as well as what is under it.
  [["/admin/*"], "/admin", true],
  [["/admin/*"], "/admin/users", true],
  [["/admin/*"], "/", false],
  // …and stops at a segment boundary, not at a prefix.
  [["/admin/*"], "/administrators", false],

  // Exact means exact.
  [["/admin"], "/admin", true],
  [["/admin"], "/admin/users", false],

  // The last rule that covers the path wins.
  [["/*", "!/admin/*"], "/projects", true],
  [["/*", "!/admin/*"], "/admin", false],
  [["/*", "!/admin/*"], "/admin/users", false],
  [["/admin/*", "!/admin/users"], "/admin", true],
  [["/admin/*", "!/admin/users"], "/admin/users", false],
  // Order is what decides it, so the same two rules the other way round mean
  // the opposite thing.
  [["!/admin/*", "/*"], "/admin", true],

  // A rule that covers nothing is simply never consulted.
  [["!/admin", "/settings"], "/admin", false],
  [["!/admin", "/settings"], "/settings", true],

  // A dynamic segment matches one segment, the way the router reads it.
  [["/projects/[id]"], "/projects/atlas", true],
  [["/projects/[id]"], "/projects", false],
  [["/projects/[id]"], "/projects/atlas/tasks", false],
  // A catch-all matches the rest of the path.
  [["/docs/[...slug]"], "/docs/a/b/c", true],
  [["/docs/[...slug]"], "/docs", false],

  // The path is normalized before anything is read against it.
  [["/admin"], "/admin/", true],
  [["/admin"], "/admin?tab=seats", true],
  [["/"], "", true],
]

let wrong = 0
for (const [paths, path, expected] of RULES) {
  const actual = isAvailableOn(paths as readonly PathPattern[], path)
  if (actual === expected) continue

  wrong += 1
  console.log(
    `  ✗ ${JSON.stringify(paths).padEnd(32)} on ${path.padEnd(22)} ` +
      `expected ${expected}, got ${actual}`
  )
}

console.log(
  `\nroute rules: ${RULES.length - wrong}/${RULES.length} as expected`
)
