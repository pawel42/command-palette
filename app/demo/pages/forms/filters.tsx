"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Icon, ICONS, useFormPage } from "@/components/command-palette"
import type { Page } from "@/components/command-palette"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"

import { EVERYWHERE } from "../../paths"

import {
  DEFAULT_FILTERS,
  RANGES,
  SORTS,
  STATUSES,
  filterSchema,
} from "./options"
import type { FilterValues } from "./options"
import { CheckboxField, CheckboxGroupField, RadioField, SelectField } from "./fields"

/**
 * The filter case, and the one that is a form only in the sense that it has
 * fields: nothing is saved anywhere, the values go back to whoever opened the
 * page.
 *
 * So `submit` here is not work and takes no signal — it is `resolve`, and
 * `useFormPage` runs it on ⌘↵ with no `loading` string, no progress bar and
 * no toast. Same chord, same validation, same absent button; the only thing
 * that changes is what "submitting" means. Esc still abandons the whole
 * thing, and the `push` that opened it settles `undefined`.
 *
 * The props are the filters as they stand, so reopening lands on what is
 * already applied rather than on the defaults.
 */
export const filtersPage: Page<FilterValues, FilterValues> = {
  id: "filters",
  title: "Filter Issues",
  search: "disabled",
  placeholder: "Filters — ⌘↵ applies them",
  render: ({ props, resolve }) => <FiltersForm current={props} apply={resolve} />,
}

function FiltersForm({
  current,
  apply,
}: {
  current: FilterValues
  apply: (values: FilterValues) => void
}) {
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    mode: "onTouched",
    defaultValues: current,
  })

  const { formProps } = useFormPage(form, {
    title: "Apply these filters",
    icon: <Icon path={ICONS.check} />,
    submit: apply,
    actions: [
      {
        id: "reset-filters",
        paths: EVERYWHERE,
        title: "Back to the defaults",
        shortcut: ["Mod", "Shift", "X"],
        icon: <Icon path={ICONS.close} />,
        run: () => form.reset(DEFAULT_FILTERS),
      },
      {
        id: "clear-filters",
        paths: EVERYWHERE,
        title: "Clear every status",
        description: "so ⌘↵ has something to refuse",
        icon: <Icon path={ICONS.dot} />,
        run: () => form.setValue("statuses", [], { shouldValidate: true }),
      },
    ],
    hints: [{ keys: ["Escape"], label: "leaves them as they were" }],
  })

  return (
    <FieldGroup {...formProps} className="p-4">
      <CheckboxGroupField
        control={form.control}
        name="statuses"
        label="Status"
        description="Clear them all and ⌘↵ says so instead of applying nothing."
        options={STATUSES}
      />

      <FieldSeparator />

      <RadioField
        control={form.control}
        name="range"
        label="Updated"
        options={RANGES}
      />

      <FieldSeparator />

      <SelectField
        control={form.control}
        name="sort"
        label="Sort by"
        options={SORTS}
      />

      <CheckboxField
        control={form.control}
        name="onlyMine"
        label="Only issues assigned to me"
      />
    </FieldGroup>
  )
}
