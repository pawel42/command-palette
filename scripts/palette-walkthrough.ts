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
} from "../lib/palette/fixtures"
import type { PaletteStore } from "../lib/palette/store"

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

store.runCommand(commands.find((command) => command.id === "blocked")!)
show(store, "run disabled command")

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

console.log("\nside effects:", log)
