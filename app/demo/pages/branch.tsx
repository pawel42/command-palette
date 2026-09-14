"use client"

import { logActivity } from "../activity"
import { Icon, ICONS, ListPage } from "@/components/command-palette"
import type { Command, Page } from "@/components/command-palette"
import { EVERYWHERE } from "../paths"
import { notePage } from "./note"

const pageA = notePage(
  "page-a",
  "Page A",
  <p>
    Pushed the ordinary way. Esc drops one level, so you land back on Branch Out
    with its query and selected row exactly as you left them.
  </p>
)

const pageB = notePage(
  "page-b",
  "Page B",
  <p>
    A different destination from the same page. The stack is linear — only the
    branch you picked is on it.
  </p>
)

const pageC = notePage(
  "page-c",
  "Page C",
  <p>
    This one was pushed with <code>{`{ escape: "root" }`}</code>, so esc skips
    Branch Out entirely and lands on the root. Same page definition, different
    esc route, decided at the push site.
  </p>
)

const destinations: Command[] = [
  {
    id: "page-a",
    paths: EVERYWHERE,
    title: "Page A",
    description: "esc → back here",
    section: "Destinations",
    icon: <Icon path={ICONS.chevronRight} />,
    page: pageA,
  },
  {
    id: "page-b",
    paths: EVERYWHERE,
    title: "Page B",
    description: "esc → back here",
    section: "Destinations",
    icon: <Icon path={ICONS.chevronRight} />,
    page: pageB,
  },
  {
    id: "page-c",
    paths: EVERYWHERE,
    title: "Page C",
    description: "esc → straight to root",
    section: "Destinations",
    icon: <Icon path={ICONS.chevronRight} />,
    page: pageC,
    options: { escape: "root" as const },
  },
  {
    id: "note",
    paths: EVERYWHERE,
    title: "Log what I typed",
    description: "runs an action, stays put",
    section: "Actions",
    icon: <Icon path={ICONS.dot} />,
    run: ({ query }) => logActivity(`branch page query: “${query}”`),
  },
]

/** Three destinations from one page, plus an action that doesn't navigate. */
export const branchPage: Page = {
  id: "branch",
  title: "Branch Out",
  placeholder: "Pick a destination…",
  render: () => <ListPage items={destinations} />,
}
