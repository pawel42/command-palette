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
import {
  isAvailableLocally,
  isLocalHost,
} from "../components/command-palette/core/local"
import {
  isAvailableTo,
  normalizeRoles,
} from "../components/command-palette/core/roles"
import type {
  RoleInput,
  RolePattern,
} from "../components/command-palette/core/roles"
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

/* ---------------------------------------------------------------- roles */

/**
 * Who a command is for. Pure `core/` like the rules above, and exercised the
 * same way: one table of rules against one table of users, and the answer each
 * pair owes. What the held roles are is a *set*, which is the whole reason the
 * reading differs from `paths`' — see the last three rows.
 */
const ROLES: Array<[readonly string[], readonly string[], boolean]> = [
  // Nobody at all, however much they are holding.
  [[], [], false],
  [[], ["admin"], false],

  // The one rule that means everyone — signed out included, which an
  // enumerated list of role names would quietly miss.
  [["*"], [], true],
  [["*"], ["viewer"], true],

  // Any of these names, held or not.
  [["admin"], ["admin"], true],
  [["admin"], ["viewer"], false],
  [["admin"], [], false],
  [["admin", "support"], ["support"], true],
  [["admin", "support"], ["member"], false],
  // Holding more than the rule asks for is still holding it.
  [["admin"], ["admin", "viewer"], true],

  // A deny wins wherever it sits, and whatever else is held.
  [["*", "!viewer"], ["admin"], true],
  [["*", "!viewer"], ["viewer"], false],
  [["*", "!viewer"], ["admin", "viewer"], false],

  // ...which is what makes the list a set rather than a sequence: the same two
  // rules the other way round mean the same thing, unlike `paths`'.
  [["!viewer", "*"], ["admin"], true],
  [["!viewer", "*"], ["viewer"], false],
  [["!viewer", "admin"], ["admin", "viewer"], false],
]

let wrongRoles = 0
for (const [roles, held, expected] of ROLES) {
  const actual = isAvailableTo(roles as readonly RolePattern[], new Set(held))
  if (actual === expected) continue

  wrongRoles += 1
  console.log(
    `  ✗ ${JSON.stringify(roles).padEnd(26)} for ${JSON.stringify(held).padEnd(22)} ` +
      `expected ${expected}, got ${actual}`
  )
}

console.log(
  `role rules: ${ROLES.length - wrongRoles}/${ROLES.length} as expected`
)

/**
 * The shapes a host can hand over. This is the one part of the palette that
 * meets an app where it already is, so the coercion is worth pinning down —
 * not least the bare string, which `new Set()` would read as five letters.
 */
const SHAPES: Array<[RoleInput, readonly string[]]> = [
  [undefined, []],
  [null, []],
  ["", []],
  ["admin", ["admin"]],
  [
    ["admin", "viewer"],
    ["admin", "viewer"],
  ],
  [[], []],
  [new Set(["admin"]), ["admin"]],
]

let wrongShapes = 0
for (const [input, expected] of SHAPES) {
  const actual = [...normalizeRoles(input)].sort()
  if (JSON.stringify(actual) === JSON.stringify([...expected].sort())) continue

  wrongShapes += 1
  console.log(
    `  ✗ ${JSON.stringify(input instanceof Set ? [...input] : input).padEnd(26)} ` +
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  )
}

console.log(
  `role shapes: ${SHAPES.length - wrongShapes}/${SHAPES.length} as expected`
)

/* ------------------------------------------------------------- environment */

/**
 * Where the app is running. The rule proper is a boolean against a boolean, so
 * that table is short — but the question it answers is a host name, and *that*
 * is worth pinning down: it is the whole of the feature, it is read off a
 * browser the engine cannot see, and every entry below is a string some host
 * really does serve an app on.
 */
const HOSTS: Array<[string, boolean]> = [
  // The machine itself, however it is spelled.
  ["localhost", true],
  ["127.0.0.1", true],
  ["0.0.0.0", true],
  ["::1", true],
  // The rest of 127/8 is loopback too, not just the .1 everyone types.
  ["127.0.0.2", true],
  // A port is not part of the name, and an IPv6 address wears brackets.
  ["localhost:3000", true],
  ["[::1]:3000", true],
  // Reserved for exactly this, and mDNS: names no deployment is given.
  ["app.localhost", true],
  ["mac-mini.local", true],
  // `file://`, which has no host at all and is not a deployment either.
  ["", true],

  // A deployment, however friendly the name looks.
  ["staging.example.com", false],
  ["example.com", false],
  // The private ranges are deliberately not local: a phone on the office wifi
  // and an internal staging box are the same string, and the wrong guess puts
  // debugging rows in front of people who are not developers.
  ["192.168.1.14", false],
  ["10.0.4.20", false],
  // Neither is a name that merely has one of the words in it.
  ["localhost.example.com", false],
  ["mylocalhost", false],
  ["127.0.0.1.example.com", false],
]

let wrongHosts = 0
for (const [hostname, expected] of HOSTS) {
  const actual = isLocalHost(hostname)
  if (actual === expected) continue

  wrongHosts += 1
  console.log(
    `  ✗ ${JSON.stringify(hostname).padEnd(26)} expected ${expected}, got ${actual}`
  )
}

console.log(`\nlocal hosts: ${HOSTS.length - wrongHosts}/${HOSTS.length} as expected`)

/**
 * And the rule itself: the third question every row is asked, and the one
 * whose default is to say yes.
 */
const LOCAL: Array<[boolean | undefined, boolean, boolean]> = [
  // No `local` at all is a command for wherever the app runs — the default,
  // and the reason this is the one field that may be left off.
  [undefined, true, true],
  [undefined, false, true],
  // `local: false` is the same answer said out loud.
  [false, false, true],
  // And `local: true` is the whole of the feature.
  [true, true, true],
  [true, false, false],
]

let wrongLocal = 0
for (const [local, isLocal, expected] of LOCAL) {
  const actual = isAvailableLocally(local, isLocal)
  if (actual === expected) continue

  wrongLocal += 1
  console.log(
    `  ✗ local ${String(local).padEnd(10)} on ${isLocal ? "a laptop" : "a deployment"} ` +
      `expected ${expected}, got ${actual}`
  )
}

console.log(
  `local rules: ${LOCAL.length - wrongLocal}/${LOCAL.length} as expected`
)
