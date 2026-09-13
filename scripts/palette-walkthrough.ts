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
