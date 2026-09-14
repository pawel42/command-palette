/**
 * Draws the README's stills and its demo GIF out of the running demo app, so
 * the pictures are the thing itself rather than a mockup of it that drifts.
 *
 * Start the app, then: npm run capture
 * Point it elsewhere with BASE=http://localhost:3001.
 *
 * Everything lands in docs/. The GIF is recorded as a webm by Playwright,
 * split into frames by the ffmpeg Playwright already ships, and joined back
 * up by sharp — no system ffmpeg, no ImageMagick, nothing to install.
 */
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { chromium } from "playwright"
import sharp from "sharp"

const BASE = process.env.BASE ?? "http://localhost:3000"
const DOCS = "docs"
const TMP = join(DOCS, ".work")

/**
 * The palette is 576 wide and sits at top-[20vh], whatever the window is.
 * The stills are shot wide and at 2x, for the detail; the video is shot in a
 * window only a little larger than the crop, so its frames are already the
 * size the GIF wants and nothing is resampled on the way out.
 */
const VIEWPORT = { width: 1280, height: 820 }
const VIDEO_VIEWPORT = { width: 960, height: 680 }
const SCALE = 2

/** What the GIF keeps of that window: the palette, and a little of the page. */
const VIDEO_CROP = "crop=760:480:100:90"

/** The GIF's rate, and so the delay between its frames. */
const FPS = 10

/**
 * Hides Next's dev overlay, stops the caret blinking mid-frame, and drops the
 * backdrop blur — headless Chromium composites it into mirrored ghost text,
 * which is a bug in the screenshot rather than anything the app does.
 */
const CALM = `
  nextjs-portal { display: none !important; }
  * { caret-color: transparent !important; backdrop-filter: none !important; }
`

/**
 * The ffmpeg Playwright installed alongside its browsers — it is the one that
 * records the video, so it can always read it back. Falls back to whatever is
 * on PATH.
 */
function findFfmpeg() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), "Library/Caches/ms-playwright"),
    join(homedir(), ".cache/ms-playwright"),
    join(process.env.LOCALAPPDATA ?? "", "ms-playwright"),
  ].filter(Boolean)

  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const dir of readdirSync(root).filter((d) => d.startsWith("ffmpeg"))) {
      const found = readdirSync(join(root, dir)).find((f) =>
        f.startsWith("ffmpeg")
      )
      if (found) return join(root, dir, found)
    }
  }
  return "ffmpeg"
}

mkdirSync(DOCS, { recursive: true })
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

/* ----------------------------------------------------------------- driving */

const browser = await chromium.launch()

async function open({ dark = false, video = false } = {}) {
  const context = await browser.newContext({
    viewport: video ? VIDEO_VIEWPORT : VIEWPORT,
    deviceScaleFactor: video ? 1 : SCALE,
    colorScheme: dark ? "dark" : "light",
    reducedMotion: video ? null : "reduce",
    recordVideo: video ? { dir: TMP, size: VIDEO_VIEWPORT } : undefined,
  })
  // next-themes reads this before the first paint, so the app is never
  // photographed flashing the other theme.
  await context.addInitScript(
    (theme) => window.localStorage.setItem("theme", theme),
    dark ? "dark" : "light"
  )

  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: "networkidle" })
  await page.addStyleTag({ content: CALM })
  await page.waitForTimeout(400)
  return { context, page }
}

/** The frame itself. `.first()` because the ⌘⇧K panel is a dialog too. */
const palette = (page) => page.locator('[role="dialog"]').first()

/** ⌘K, and the fade it opens on. */
async function openPalette(page) {
  await page.keyboard.press("Meta+k")
  await palette(page).locator("input").first().waitFor({ state: "visible" })
  await page.waitForTimeout(350)
}

/** Types the way a person does, so the list is seen filtering. */
async function type(page, text, delay = 70) {
  await page.keyboard.type(text, { delay })
}

/**
 * The palette plus a margin of the app behind it — a crop of the dim, not a
 * cutout of the dialog, so the shot still says this is a layer over a page.
 */
async function shoot(page, name, pad = { x: 150, y: 96 }) {
  const box = await palette(page).boundingBox()
  await page.screenshot({
    path: join(DOCS, `${name}.png`),
    clip: {
      x: Math.max(0, box.x - pad.x),
      y: Math.max(0, box.y - pad.y),
      width: Math.min(VIEWPORT.width, box.width + pad.x * 2),
      height: Math.min(VIEWPORT.height, box.height + pad.y * 2),
    },
  })
  console.log(`  docs/${name}.png`)
}

/* ------------------------------------------------------------------ stills */

console.log("stills:")

/** Clears the input without going through esc, which would unwind a page. */
async function clear(page) {
  await palette(page).locator("input").first().fill("")
  await page.waitForTimeout(250)
}

{
  /* The root list: sections, icons, the chords on the right, the hint row. */
  const { context, page } = await open()
  await openPalette(page)
  await shoot(page, "root")

  /* Typing: one ranked list under one heading, matched on keywords too — */
  /* not one of these four says "form" in its title. */
  await type(page, "form")
  await page.waitForTimeout(350)
  await shoot(page, "search")

  /* A page pushed on the stack — the form, its fields, its own footer. */
  await clear(page)
  await type(page, "new issue", 40)
  await page.waitForTimeout(350)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(600)
  await page.keyboard.type("Palette swallows the second escape", { delay: 12 })
  await page.waitForTimeout(300)
  await shoot(page, "form")

  await context.close()
}

{
  /* Where a command exists: one query, two paths, and the rules between. */
  const { context, page } = await open()

  await openPalette(page)
  await type(page, "project", 40)
  await page.waitForTimeout(350)
  await shoot(page, "paths-home")

  /* Walk into a project with the palette still open — the list rebuilds
     under it: two more rows that exist only on `/projects/[id]`. */
  await clear(page)
  await type(page, "go to a project", 25)
  await page.waitForTimeout(300)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(600)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(900)
  await clear(page)
  await type(page, "project", 40)
  await page.waitForTimeout(350)
  await shoot(page, "paths-project")

  await context.close()
}

{
  /* ⌘⇧K: the footer's actions, filtered by the very same rules — the admin
     row is in this panel here and nowhere else. */
  const { context, page } = await open()
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" })
  await page.addStyleTag({ content: CALM })
  await openPalette(page)
  await page.keyboard.press("Meta+Shift+k")
  await page.waitForTimeout(600)
  await shoot(page, "actions")

  await context.close()
}

{
  /* Work that takes a moment: the bar under the input, the footer saying so. */
  const { context, page } = await open({ dark: true })
  await openPalette(page)
  await type(page, "sync", 50)
  await page.waitForTimeout(250)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(700)
  await shoot(page, "async")

  /* And the outcome, in the same line. */
  await page.waitForTimeout(2600)
  await shoot(page, "async-done")

  await context.close()
}

/* ------------------------------------------------------------------- video */

console.log("video:")

{
  const { context, page } = await open({ video: true })

  await page.waitForTimeout(700)
  await openPalette(page)
  await page.waitForTimeout(700)

  /* Fuzzy search — none of those letters are consecutive — then a page on
     the stack, scrolled, and esc twice: once to pop it, once to clear the
     text it left in the root's input. */
  await type(page, "relnotes", 85)
  await page.waitForTimeout(800)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(650)
  for (let press = 0; press < 3; press++) {
    await page.keyboard.press("ArrowDown")
    await page.waitForTimeout(130)
  }
  await page.waitForTimeout(700)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(600)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(500)

  /* Asking for something that does not exist here. */
  await type(page, "purge", 95)
  await page.waitForTimeout(1200)

  /* Move the app under the open palette, and ask again. Same registry, same
     query, different path — and the command that was nowhere is now a row. */
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)
  await type(page, "go to admin", 60)
  await page.waitForTimeout(600)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(900)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)
  await type(page, "purge", 95)
  await page.waitForTimeout(1100)

  /* And the run that reports itself: the bar, then how it went. */
  await page.keyboard.press("Enter")
  await page.waitForTimeout(3400)

  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(700)

  const video = page.video()
  await context.close()
  const webm = await video.path()

  /* ---- webm → frames → gif ------------------------------------------- */

  const ffmpeg = findFfmpeg()
  const frames = join(TMP, "frames")
  mkdirSync(frames, { recursive: true })

  /* Crop to the palette and a margin of the page behind it — no scale, the
     window was sized for it. The rate is an output option rather than an
     `fps` filter: Playwright's ffmpeg is built with crop, scale and pad and
     nothing else. */
  const pattern = join(frames, "%04d.png")
  execFileSync(
    ffmpeg,
    ["-i", webm, "-vf", VIDEO_CROP, "-r", String(FPS), pattern],
    { stdio: ["ignore", "ignore", "ignore"] }
  )

  const files = readdirSync(frames)
    .filter((f) => f.endsWith(".png"))
    .sort()
  const buffers = files.map((f) => readFileSync(join(frames, f)))

  await sharp(buffers, { join: { animated: true } })
    .gif({ delay: 1000 / FPS, loop: 0, colours: 64, dither: 0.5 })
    .toFile(join(DOCS, "demo.gif"))

  console.log(`  docs/demo.gif (${files.length} frames)`)
}

await browser.close()
rmSync(TMP, { recursive: true, force: true })
console.log("done")
