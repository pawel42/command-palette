"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Icon,
  ICONS,
  useFormPage,
  useNavigation,
} from "@/components/command-palette"
import type { Page } from "@/components/command-palette"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"

import { logActivity } from "../../activity"
import { createIssue } from "../../api"
import { EVERYWHERE } from "../../paths"

import {
  ASSIGNEES,
  LABELS,
  PRIORITIES,
  VISIBILITY,
  issueSchema,
} from "./options"
import type { IssueValues } from "./options"
import {
  CheckboxField,
  CheckboxGroupField,
  RadioField,
  SelectField,
} from "./fields"

/**
 * The full form: text, two portalled selects, a checkbox group, radios, a
 * single checkbox and a textarea, validated by zod and submitted on ⌘↵.
 *
 * There is no button in it, and that is the whole shape of a palette form.
 * The submit is a footer action, so it is drawn with its chord, searchable in
 * ⌘⇧K, and the one thing on the page the user's hands never have to leave the
 * keyboard for. `useFormPage` is what puts it there.
 *
 * `search: "disabled"` is not decoration either — it is what stops the frame
 * claiming the caret back on every render, which is what would otherwise make
 * every field in here unusable.
 */
export const newIssuePage: Page = {
  id: "new-issue",
  title: "New Issue",
  search: "disabled",
  placeholder: "New issue — ⌘↵ to create",
  render: () => <NewIssueForm />,
}

function NewIssueForm() {
  const nav = useNavigation()

  const form = useForm<IssueValues>({
    resolver: zodResolver(issueSchema),
    // Errors appear as the user fixes them rather than only on the next ⌘↵.
    mode: "onSubmit",
    defaultValues: {
      title: "",
      priority: "normal",
      assignee: "unassigned",
      labels: [],
      visibility: "team",
      notify: true,
      description: "",
    },
  })

  const { formProps } = useFormPage(form, {
    title: "Create the issue",
    icon: <Icon path={ICONS.check} />,
    loading: "Creating the issue…",
    success: (key) => `Created ${key}`,
    submit: (values, signal) => createIssue(values.title, signal),
    // Only on a real landing: a failed create leaves the user here with every
    // value still in the form, which is the whole reason `done` is separate
    // from `submit`.
    done: (key) => {
      logActivity(`created ${key}`)
      nav.popToRoot()
    },
    actions: [
      {
        id: "reset-issue",
        paths: EVERYWHERE,
        title: "Clear the form",
        shortcut: ["Mod", "Shift", "X"],
        icon: <Icon path={ICONS.close} />,
        run: () => form.reset(),
      },
    ],
    hints: [{ keys: ["Escape"], label: "discards this issue" }],
  })

  const { errors } = form.formState

  // `formProps` is what keeps ⌘↵ working with the caret in a checkbox or a
  // radio — see `useFormPage`.
  return (
    <FieldGroup {...formProps} className="p-4">
      <Field data-invalid={Boolean(errors.title) || undefined}>
        <FieldLabel htmlFor="issue-title">Title</FieldLabel>
        <Input
          id="issue-title"
          placeholder="Esc closes the select and the page"
          autoFocus
          aria-invalid={Boolean(errors.title) || undefined}
          {...form.register("title")}
        />
        <FieldError errors={[errors.title]} />
      </Field>

      <SelectField
        control={form.control}
        name="priority"
        label="Priority"
        options={PRIORITIES}
        description="Open it and press esc — the menu closes, the form stays."
      />

      <SelectField
        control={form.control}
        name="assignee"
        label="Assignee"
        options={ASSIGNEES}
      />

      <CheckboxGroupField
        control={form.control}
        name="labels"
        label="Labels"
        description="Tab to a box, space to toggle. One array, one rule."
        options={LABELS}
      />

      <RadioField
        control={form.control}
        name="visibility"
        label="Visibility"
        options={VISIBILITY}
      />

      <CheckboxField
        control={form.control}
        name="notify"
        label="Notify the assignee"
      />

      <Field data-invalid={Boolean(errors.description) || undefined}>
        <FieldLabel htmlFor="issue-description">Description</FieldLabel>
        <Textarea
          id="issue-description"
          rows={3}
          placeholder="⌘↵ works from in here too"
          aria-invalid={Boolean(errors.description) || undefined}
          {...form.register("description")}
        />
        <FieldDescription>
          Over 180 characters and ⌘↵ refuses, in the footer.
        </FieldDescription>
        <FieldError errors={[errors.description]} />
      </Field>
    </FieldGroup>
  )
}
