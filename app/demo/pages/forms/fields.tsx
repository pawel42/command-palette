"use client"

import { useId } from "react"
import { Controller } from "react-hook-form"
import type { Control, FieldValues, Path, PathValue } from "react-hook-form"

import { claimsEscape } from "@/components/command-palette"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * shadcn's `Field` primitives bound to react-hook-form, once, so the two form
 * pages are a list of fields and nothing else.
 *
 * Three things here are load-bearing inside a palette, and none of them are
 * react-hook-form's doing:
 *
 *  - every overlay gets `claimsEscape`, or the esc that closes a dropdown also
 *    unwinds the page out from under the form;
 *  - `field.ref` goes on the *trigger*, not the hidden input, so RHF's
 *    focus-the-first-error actually lands somewhere the user can see;
 *  - Radix owns the arrow keys on a `RadioGroup` and calls `preventDefault`,
 *    which is what stops the palette frame reading the same press as "scroll
 *    the page". The frame checks `defaultPrevented` before it touches a key,
 *    so a widget that handles its own keys wins without having to know the
 *    palette is there.
 */

type Option = { readonly value: string; readonly label: string }

type Base<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
}

/* ------------------------------------------------------------------ select */

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  placeholder,
}: Base<T> & {
  options: readonly Option[]
  placeholder?: string
}) {
  const id = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              id={id}
              ref={field.ref}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid || undefined}
              className="w-full"
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent {...claimsEscape}>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

/* --------------------------------------------------------- checkbox group */

/**
 * The filter case: many checkboxes over one array-valued field. The array is
 * the form's value, so RHF sees one field and the schema validates it as one
 * — "pick at least one" is a rule about the whole group, not about any box in
 * it.
 */
export function CheckboxGroupField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
}: Base<T> & { options: readonly Option[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected: string[] = field.value ?? []

        const toggle = (value: string, checked: boolean) =>
          field.onChange(
            checked
              ? [...selected, value]
              : selected.filter((entry) => entry !== value)
          )

        return (
          <FieldSet data-invalid={fieldState.invalid || undefined}>
            <FieldLegend variant="label">{label}</FieldLegend>
            {description && <FieldDescription>{description}</FieldDescription>}
            {/* A plain div, not shadcn's `FieldGroup`. `FieldGroup` carries
                `@container/field-group` — `container-type: inline-size` — and
                nesting one inside a `<fieldset>` that is itself `display:
                flex` makes Chrome drop the boxes of every row in it on a
                later re-render: the markup is correct, the computed display
                is still `flex`, and `getClientRects()` comes back empty. A
                resize does not bring them back. shadcn does not nest them
                either — `FieldSet` styles `has-[>[data-slot=checkbox-group]]`,
                so the rows are meant to sit directly under it. */}
            <div className="flex flex-col gap-2.5">
              {options.map((option, index) => (
                <CheckboxRow
                  key={option.value}
                  label={option.label}
                  checked={selected.includes(option.value)}
                  onChange={(checked) => toggle(option.value, checked)}
                  // One ref for the group, on its first box: RHF focuses the
                  // field it was handed, and the first row is the one the
                  // user should be looking at when the group is what failed.
                  ref={index === 0 ? field.ref : undefined}
                  invalid={fieldState.invalid}
                />
              ))}
            </div>
            <FieldError errors={[fieldState.error]} />
          </FieldSet>
        )
      }}
    />
  )
}

function CheckboxRow({
  label,
  checked,
  onChange,
  ref,
  invalid,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  ref?: React.Ref<HTMLButtonElement>
  invalid?: boolean
}) {
  const id = useId()

  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        ref={ref}
        checked={checked}
        aria-invalid={invalid || undefined}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
    </Field>
  )
}

/* ------------------------------------------------------- single checkbox */

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: Base<T>) {
  const id = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal">
          <Checkbox
            id={id}
            ref={field.ref}
            checked={Boolean(field.value)}
            onCheckedChange={(next) => field.onChange(next === true)}
          />
          <FieldLabel htmlFor={id} className="font-normal">
            {label}
            {description && (
              <FieldDescription className="ml-1.5 inline">
                {description}
              </FieldDescription>
            )}
          </FieldLabel>
        </Field>
      )}
    />
  )
}

/* --------------------------------------------------------------- radios */

export function RadioField<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: Base<T> & {
  options: readonly (Option & { hint?: string })[]
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid || undefined}>
          <FieldLegend variant="label">{label}</FieldLegend>
          {/* Radix takes ↑↓←→ here and prevents them, so the page underneath
              never scrolls on a press the radio group has already spent. */}
          <RadioGroup
            value={field.value as PathValue<T, Path<T>>}
            onValueChange={field.onChange}
            className="gap-2.5"
          >
            {options.map((option, index) => (
              <RadioRow
                key={option.value}
                option={option}
                ref={index === 0 ? field.ref : undefined}
              />
            ))}
          </RadioGroup>
          <FieldError errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  )
}

function RadioRow({
  option,
  ref,
}: {
  option: Option & { hint?: string }
  ref?: React.Ref<HTMLButtonElement>
}) {
  const id = useId()

  return (
    <Field orientation="horizontal">
      <RadioGroupItem id={id} ref={ref} value={option.value} />
      <FieldLabel htmlFor={id} className="font-normal">
        {option.label}
        {option.hint && (
          <FieldDescription className="ml-1.5 inline">
            {option.hint}
          </FieldDescription>
        )}
      </FieldLabel>
    </Field>
  )
}
