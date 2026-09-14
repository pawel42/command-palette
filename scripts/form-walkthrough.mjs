/**
 * Drives the two form pages in a real browser, which is the only place the
 * things they are testing are true: focus, portals, capture-phase key
 * handling and what the footer actually says.
 *
 * Start the app, then: npm run form-walkthrough
 * Point it elsewhere with BASE=http://localhost:3001.
 *
 * What it pins down, in order — each of these was a real bug at some point:
 *  T3  esc closes a Radix select without also unwinding the page
 *  T4  tab cycles the form's own fields and never leaves the palette
 *  T4b a field arrives whole — the hint under the last one is not left below the fold
 *  T5  ⌘↵ submits from anywhere in the form, checkboxes and radios included
 *  T7  an invalid form refuses: the fields say why, the palette shakes
 *  T8  a form that resolves hands its values back to the command that pushed it
 */
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "http://localhost:3000"
const results = []
let page

const ok = (name, detail = "") => results.push(["PASS", name, detail])
const bad = (name, detail = "") => results.push(["FAIL", name, detail])

function check(name, cond, detail = "") {
  if (cond) ok(name, detail)
  else bad(name, detail)
}

/* ------------------------------------------------------------- helpers */

const palette = () => page.locator('[role="dialog"]')
const input = () => palette().locator('input[role="combobox"]')

/** Which page the frame is showing: its placeholder, or its title. */
async function where() {
  const box = input()
  if (await box.count()) return await box.getAttribute("placeholder")
  return (await palette().locator("h2").first().textContent())?.trim()
}

async function activeInfo() {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    return {
      tag: el.tagName,
      id: el.id,
      role: el.getAttribute("role"),
      slot: el.getAttribute("data-slot"),
      name: el.getAttribute("name") ?? el.getAttribute("aria-label"),
    }
  })
}

/**
 * The footer row only — the frame's last child. Reading the whole palette
 * would match a field error drawn in the body and call it a toast.
 */
async function footerText() {
  return await page.evaluate(() => {
    const frame = document.querySelector('[role="dialog"] [class*="--palette-h"]')
    return frame?.lastElementChild?.textContent ?? ""
  })
}

async function paletteOpen() {
  return await input().isVisible().catch(() => false)
}

async function escapeToRoot() {
  for (let i = 0; i < 6; i++) {
    if (!(await paletteOpen())) return
    if ((await where())?.includes("Search")) return
    await page.keyboard.press("Escape")
    await page.waitForTimeout(150)
  }
}

/** Open it if it is shut, and leave it sitting on an empty root either way. */
async function openPalette() {
  if (!(await paletteOpen())) {
    await page.keyboard.press("Meta+k")
    await input().waitFor({ state: "visible", timeout: 5000 })
    await page.waitForTimeout(150)
  }
  await escapeToRoot()
  if (!(await paletteOpen())) {
    await page.keyboard.press("Meta+k")
    await input().waitFor({ state: "visible", timeout: 5000 })
  }
  await input().fill("")
  await page.waitForTimeout(120)
}

async function runRow(text) {
  await input().fill(text)
  await page.waitForTimeout(120)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(250)
}

/* --------------------------------------------------------------- tests */

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
page = await context.newPage()
page.on("pageerror", (e) => console.log("DIAG pageerror:", e.message))
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) console.log("DIAG console." + m.type() + ":", m.text().slice(0, 300))
})
await page.addInitScript(() => {
  window.addEventListener("unhandledrejection", (e) =>
    console.error("UNHANDLED REJECTION: " + (e.reason?.message ?? String(e.reason)) + " :: " + (e.reason?.stack ?? "").split("\n").slice(0,4).join(" | "))
  )
})
await page.goto(BASE, { waitUntil: "networkidle" })

try {
/* T1 — the form opens, is inert-searched, and claims focus */
await openPalette()
await runRow("New Issue")
check("T1 form page opened", (await where())?.includes("New issue"), await where())
check("T1 palette input is disabled", await input().isDisabled())
{
  const a = await activeInfo()
  check("T1 autoFocus landed on the title field", a?.id === "issue-title", JSON.stringify(a))
}
{
  const footer = await footerText()
  check("T1 the submit chord is in the hints", /submits/.test(footer), footer.slice(0, 80))
  check("T1 backspace is not advertised", !/⌫|Backspace/.test(footer), footer.slice(0, 80))
}

/* T2 — cmd+enter on an invalid form refuses, says why, focuses the error */
await page.keyboard.press("Meta+Enter")
await page.waitForTimeout(350)
check("T2 invalid form did not submit", (await where())?.includes("New issue"), await where())
{
  const footer = await footerText()
  check(
    "T2 the failure is NOT a toast",
    !/three characters|check the form/i.test(footer),
    footer.replace(/\n/g, " | ").slice(0, 120)
  )
  const inline = await palette().locator('[data-slot="field-error"]').allTextContents()
  check(
    "T2 the field says it where the problem is",
    inline.some((text) => /three characters/i.test(text)),
    JSON.stringify(inline)
  )
  const a = await activeInfo()
  check("T2 focus went to the offending field", a?.id === "issue-title", JSON.stringify(a))
}

/* T3 — esc closes a Select without unwinding the page  (the claimsEscape fix) */
await page.locator("#issue-title").fill("Keyboard focus escapes the palette")
await page.locator('[data-slot="select-trigger"]').first().click()
await page.waitForTimeout(200)
const listbox = page.locator('[data-slot="select-content"]')
check("T3 select opened", await listbox.count() > 0)

await page.keyboard.press("Escape")
await page.waitForTimeout(250)
check("T3 esc closed the select", (await listbox.count()) === 0)
check(
  "T3 esc did NOT also unwind the page",
  (await where())?.includes("New issue"),
  await where()
)
check(
  "T3 the form kept its values",
  (await page.locator("#issue-title").inputValue()) === "Keyboard focus escapes the palette"
)

/* a second esc, with nothing open, still leaves */
await page.keyboard.press("Escape")
await page.waitForTimeout(250)
check("T3 the next esc unwinds to the root", (await where())?.includes("Search"), await where())

/* T4 — tab cycles the form's own fields and nothing else */
await runRow("New Issue")
await page.waitForTimeout(200)
const ring = []
for (let i = 0; i < 14; i++) {
  await page.keyboard.press("Tab")
  await page.waitForTimeout(40)
  const a = await activeInfo()
  ring.push(a?.id || a?.slot || a?.tag)
}
check(
  "T4 tab never leaves the palette",
  ring.every(Boolean) && !ring.includes("BODY"),
  ring.join(" → ")
)
check(
  "T4 tab wraps rather than escaping",
  new Set(ring).size < ring.length,
  `${new Set(ring).size} distinct stops over ${ring.length} presses`
)
check(
  "T4 the palette's own chrome is not a tab stop",
  !ring.some((id) => id === "select-trigger-back" || id === "actions-trigger"),
  ring.join(" → ")
)

/* T4b — tabbing to a field brings the whole of it, hint included, into view */
{
  // Tabbed to, not focused from the script: the browser's own scroll-on-focus
  // is the thing being measured, and `.focus()` would be a different one.
  for (let i = 0; i < 14; i++) {
    if ((await activeInfo())?.id === "issue-description") break
    await page.keyboard.press("Tab")
    await page.waitForTimeout(40)
  }
  await page.waitForTimeout(150)

  const shown = await page.evaluate(() => {
    const scroller = document.querySelector('[role="dialog"] .overflow-y-auto')
    const hint = [...document.querySelectorAll('[data-slot="field-description"]')].pop()
    const field = hint.getBoundingClientRect()
    const box = scroller.getBoundingClientRect()
    return {
      active: document.activeElement?.id,
      text: hint.textContent.slice(0, 24),
      visible: field.top >= box.top - 1 && field.bottom <= box.bottom + 1,
    }
  })
  check(
    "T4b the last field's own hint is not left below the fold",
    shown.active === "issue-description" && shown.visible,
    JSON.stringify(shown)
  )
}

/* T5 — the happy path: cmd+enter, a toast, and it pops home */
await page.locator("#issue-title").fill("Ship the form API")
await page.locator('[data-slot="checkbox"]').first().click()
await page.waitForTimeout(120)
await page.keyboard.press("Meta+Enter")
await page.waitForTimeout(500)
{
  const footer = await footerText()
  check("T5 the run is reported while it is in flight", /Creating the issue/i.test(footer), footer.replace(/\n/g, " | ").slice(0, 160))
}
await page.waitForTimeout(1400)
check("T5 popped back to the root after a real save", (await where())?.includes("Search"), await where())
{
  const footer = await footerText()
  check("T5 the outcome names what came back", /Created PAL-/.test(footer), footer.replace(/\n/g, " | ").slice(0, 160))
}
await page.keyboard.press("Escape")
await page.waitForTimeout(300)
{
  const log = await page.locator('[aria-label="Recent palette activity"]').textContent()
  check("T5 the host heard about it", /created PAL-/.test(log ?? ""), (log ?? "").slice(0, 80))
}

/* T6 — the filter form: radios own the arrows, cmd+enter resolves */
await openPalette()
await runRow("Filter Issues")
check("T6 filter page opened", (await where())?.includes("Filters"), await where())
if (!(await where())?.includes("Filters")) {
  const rows = await palette().locator('[role="option"]').allTextContents()
  console.log("DIAG rows:", JSON.stringify(rows.slice(0, 8)))
  console.log("DIAG where:", await where())
}

const scroller = palette().locator("div.overflow-y-auto").first()
await page.locator('[data-slot="radio-group-item"]').first().focus()
// Read *after* the focus, not before it. Focusing a field scrolls the whole of
// it into view — label, control and the hint under it, see `useFormPage` — and
// that is a different scroll with a different cause. What this is watching for
// is the frame reading an arrow the radio group has already spent.
await page.waitForTimeout(150)
const before = await scroller.evaluate((el) => el.scrollTop)
await page.keyboard.press("ArrowDown")
await page.waitForTimeout(150)
const after = await scroller.evaluate((el) => el.scrollTop)
check(
  "T6 arrow in a radio group did not scroll the page by a step",
  Math.abs(after - before) < 40,
  `scrollTop ${before} → ${after} (a frame-driven step is 40)`
)
{
  const a = await activeInfo()
  check("T6 arrow moved the radio selection", a?.slot === "radio-group-item", JSON.stringify(a))
}

/* T7 — an invalid filter set refuses, with its own wording */
await page.keyboard.press("Meta+Shift+k")
await page.waitForTimeout(200)
await page.keyboard.type("Clear every")
await page.waitForTimeout(200)
await page.keyboard.press("Enter")
await page.waitForTimeout(250)
await page.keyboard.press("Meta+Enter")
// Read before the shake is over — it runs for SHAKE_MS and a finished
// animation is no longer a running one.
const shook = await page.evaluate(() =>
  document
    .querySelector('[role="dialog"]')
    ?.getAnimations()
    .some((animation) => animation.playState === "running")
)
check("T7 the palette shook about it", shook === true, String(shook))
await page.waitForTimeout(450)
check("T7 the empty filter set did not apply", (await where())?.includes("Filters"), await where())
{
  const footer = await footerText()
  check(
    "T7 nothing was toasted about it",
    !/nothing would match|check the form/i.test(footer),
    footer.replace(/\n/g, " | ").slice(0, 120)
  )
  const inline = await palette().locator('[data-slot="field-error"]').allTextContents()
  check(
    "T7 the fieldset carries the message instead",
    inline.some((text) => /nothing in it shows nothing/i.test(text)),
    JSON.stringify(inline)
  )
}

/* T8 — a valid apply resolves back to the command that pushed it */
await page.waitForTimeout(300)
// Space on a focused checkbox — the keyboard path, which is the one that
// matters here, and immune to anything overlaying the box.
await page.locator('[data-slot="checkbox"]').first().focus().catch(() => {})
await page.keyboard.press("Space")
await page.waitForTimeout(200)
await page.keyboard.press("Meta+Enter")
await page.waitForTimeout(400)
check("T8 applying resolved the page", (await where())?.includes("Search"), await where())
await page.keyboard.press("Escape")
await page.waitForTimeout(300)
{
  const log = await page.locator('[aria-label="Recent palette activity"]').textContent()
  check("T8 the resolved values reached the host", /filtered:/.test(log ?? ""), (log ?? "").slice(0, 90))
}

} catch (error) {
  bad("suite ran to completion", String(error).split("\n")[0])
}

await browser.close()

/* -------------------------------------------------------------- report */
const pad = Math.max(...results.map(([, n]) => n.length))
for (const [state, name, detail] of results) {
  console.log(`${state === "PASS" ? "✓" : "✗"} ${name.padEnd(pad)}  ${detail}`)
}
const failed = results.filter(([s]) => s === "FAIL")
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
