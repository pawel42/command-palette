import { z } from "zod"

/**
 * The option lists and the schemas behind the two form pages. Kept apart from
 * the markup because both pages read them and because a schema is the one
 * place the rules live — the fields draw what it says, and `useFormPage`
 * refuses to submit what it rejects.
 */

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent — pages someone" },
] as const

export const ASSIGNEES = [
  { value: "unassigned", label: "Unassigned" },
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "alan", label: "Alan Turing" },
] as const

export const LABELS = [
  { value: "bug", label: "Bug" },
  { value: "keyboard", label: "Keyboard" },
  { value: "a11y", label: "Accessibility" },
  { value: "docs", label: "Docs" },
  { value: "perf", label: "Performance" },
] as const

/**
 * Long enough to be worth searching, which is the whole reason the field that
 * draws it is a menu with a box in it rather than a column of checkboxes:
 * five labels are a list the eye reads, fourteen components are a wall the
 * user has to scroll a form to get past.
 */
export const COMPONENTS = [
  { value: "palette", label: "Command palette" },
  { value: "frame", label: "Frame and footer" },
  { value: "stack", label: "Page stack" },
  { value: "routing", label: "Routing" },
  { value: "keys", label: "Key handling" },
  { value: "shortcuts", label: "Shortcuts" },
  { value: "search", label: "Search and ranking" },
  { value: "forms", label: "Forms" },
  { value: "async", label: "Async and toasts" },
  { value: "theming", label: "Theming" },
  { value: "i18n", label: "Internationalization" },
  { value: "docs", label: "Documentation" },
  { value: "build", label: "Build and tooling" },
  { value: "tests", label: "Walkthroughs" },
] as const

export const VISIBILITY = [
  { value: "team", label: "Team", hint: "everyone in the workspace" },
  { value: "private", label: "Private", hint: "you and the assignee" },
] as const

export const issueSchema = z.object({
  title: z.string().trim().min(3, "A title needs at least three characters"),
  priority: z.enum(["low", "normal", "high", "urgent"], {
    // Only reachable by clearing it, but a schema that cannot say what is
    // wrong is a schema the footer has nothing to quote.
    message: "Pick a priority",
  }),
  assignee: z.string(),
  labels: z.array(z.string()).min(1, "Pick at least one label"),
  components: z.array(z.string()),
  visibility: z.enum(["team", "private"]),
  notify: z.boolean(),
  description: z.string().max(180, "Keep the description under 180 characters"),
})

export type IssueValues = z.infer<typeof issueSchema>

export const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in-review", label: "In review" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
] as const

export const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
] as const

export const SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title, A–Z" },
] as const

export const filterSchema = z.object({
  statuses: z
    .array(z.string())
    .min(1, "A filter with nothing in it shows nothing"),
  range: z.enum(["today", "week", "month", "all"]),
  sort: z.enum(["updated", "created", "priority", "title"]),
  onlyMine: z.boolean(),
})

export type FilterValues = z.infer<typeof filterSchema>

export const DEFAULT_FILTERS: FilterValues = {
  statuses: ["open", "in-review"],
  range: "week",
  sort: "updated",
  onlyMine: false,
}

/** One line describing a filter set, for the activity log. */
export function describeFilters(values: FilterValues): string {
  const statuses = values.statuses
    .map((value) => STATUSES.find((s) => s.value === value)?.label ?? value)
    .join(", ")
  const range = RANGES.find((r) => r.value === values.range)?.label
  const sort = SORTS.find((s) => s.value === values.sort)?.label

  return `filtered: ${statuses} · ${range} · ${sort}${values.onlyMine ? " · mine" : ""}`
}
