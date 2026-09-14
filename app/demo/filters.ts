"use client"

import { DEFAULT_FILTERS } from "./pages/forms"
import type { FilterValues } from "./pages/forms"

/**
 * The filters as they stand. A module store, like `recent.ts`: the command
 * that opens the page reads it to pass as props, and writes back whatever the
 * page resolved with — so reopening lands on what is applied rather than on
 * the defaults.
 */
let current: FilterValues = DEFAULT_FILTERS

export const currentFilters = (): FilterValues => current

export function setFilters(next: FilterValues) {
  current = next
}
