"use client"

import { useId, useMemo, useRef, useState } from "react"
import { Controller } from "react-hook-form"
import type { Control, FieldValues, Path } from "react-hook-form"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import {
  Highlight,
  claimsEscape,
  fuzzyMatch,
  normalizeQuery,
} from "@/components/command-palette"
import type { Match } from "@/components/command-palette"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * The field a filter bar is made of, inside a palette form: a select that
 * opens a searchable list of checkboxes and keeps as many of them as the user
 * ticks.
 *
 * It exists because the plain checkbox group it sits next to stops working
 * somewhere around a dozen options — five labels is a list, forty components
 * is a wall — and because a `Select` cannot hold more than one answer. The
 * shape both problems point at is the one every filter menu already has: a
 * trigger that says what is chosen, and a menu you type into.
 *
 * Three things in here are the palette's rather than this form's:
 *
 *  - the menu filters with `fuzzyMatch` and draws the hits with `Highlight`,
 *    which is the same matcher and the same marking the palette's own root
 *    list uses. A second search box that ranked differently to the one three
 *    inches above it would be a second set of rules to learn;
 *  - the menu is a portalled Radix layer, so it gets `claimsEscape` — without
 *    it, the esc that closes the menu keeps going and unwinds the form;
 *  - the caret never leaves the search box. ↑↓ move a highlight and ↵ ticks
 *    it, `aria-activedescendant` rather than roving focus, which is what the
 *    frame's own list does — and, here, what keeps the ring of tab stops the
 *    size of the form rather than the size of the option list.
 */

type Option = { readonly value: string; readonly label: string }

export function MultiSelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  placeholder = "Nothing selected",
  emptyMessage = "No match",
}: {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
  options: readonly Option[]
  placeholder?: string
  emptyMessage?: string
}) {
  const id = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <MultiSelect
            id={id}
            // On the trigger, not on anything hidden: RHF focuses the field it
            // was handed, and this is the part of it the user can see.
            ref={field.ref}
            label={label}
            options={options}
            value={field.value ?? []}
            onChange={field.onChange}
            onBlur={field.onBlur}
            invalid={fieldState.invalid}
            placeholder={placeholder}
            emptyMessage={emptyMessage}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

/**
 * The same classes shadcn puts on a `SelectTrigger`, because this is one as
 * far as the user is concerned: a closed menu in a form should not be a
 * different-looking box depending on how many answers it takes.
 */
const TRIGGER =
  "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40"

function MultiSelect({
  id,
  ref,
  label,
  options,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder,
  emptyMessage,
}: {
  id: string
  ref?: React.Ref<HTMLButtonElement>
  label: string
  options: readonly Option[]
  value: readonly string[]
  onChange: (next: string[]) => void
  onBlur?: () => void
  invalid?: boolean
  placeholder: string
  emptyMessage: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listId = useId()
  const searchRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    const normalized = normalizeQuery(query)
    const scored = options
      .map((option) => ({
        option,
        match: fuzzyMatch(option.label, normalized),
      }))
      .filter(
        (row): row is { option: Option; match: Match } => row.match !== null
      )

    // Ranked only once there is something to rank by. With an empty box the
    // list is the one the form declared, and an option that does not move
    // while the user is not typing is one they can learn the position of.
    return normalized
      ? [...scored].sort((a, b) => b.match.score - a.match.score)
      : scored
  }, [options, query])

  // Clamped rather than reset: the list shrinks under the highlight as the
  // user types, and a highlight past the end is one ↵ spent on nothing.
  const index = Math.min(active, Math.max(matches.length - 1, 0))
  const optionId = (position: number) => `${listId}-${position}`

  // In the options' own order, not the order they were ticked: the trigger is
  // read against the open menu, and two different orders for one answer is a
  // sentence the user has to re-read every time.
  const chosen = options.filter((option) => value.includes(option.value))

  const toggle = (option: Option) =>
    onChange(
      value.includes(option.value)
        ? value.filter((entry) => entry !== option.value)
        : [...value, option.value]
    )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery("")
          setActive(0)
        } else {
          // Closing the menu is the moment the field was answered, so this is
          // where RHF is told it was touched.
          onBlur?.()
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          ref={ref}
          // `data-invalid`, not `aria-invalid`: this is a disclosure button,
          // and ARIA has no invalid state for one — the combobox in the menu
          // is the thing being filled in. The ring is the same either way.
          data-invalid={invalid || undefined}
          className={TRIGGER}
        >
          <span
            className={`truncate ${chosen.length === 0 ? "text-muted-foreground" : ""}`}
          >
            {chosen.length === 0
              ? placeholder
              : chosen.map((option) => option.label).join(", ")}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        {...claimsEscape}
        // The trigger's width, so the menu reads as the field opening rather
        // than as something arriving over the top of it.
        className="w-(--radix-popover-trigger-width) p-0"
        // Radix focuses the content box itself; the search field is the only
        // thing in here that should ever hold the caret.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          searchRef.current?.focus()
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-2.5">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            placeholder={`Filter ${label.toLowerCase()}…`}
            aria-label={`Filter ${label.toLowerCase()}`}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={matches.length ? optionId(index) : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(event) => {
              // ⌘↵ belongs to the form, and a portalled menu is outside the
              // element `formProps` is watching — so it cannot be forwarded
              // from in here. Left alone rather than spent on a toggle: esc
              // closes the menu and the chord works again a key later.
              if (event.metaKey || event.ctrlKey) return

              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                // Prevented, or the frame reads the same press as "scroll the
                // page underneath".
                event.preventDefault()
                if (matches.length === 0) return
                const step = event.key === "ArrowDown" ? 1 : -1
                setActive((index + step + matches.length) % matches.length)
                return
              }

              if (event.key === "Enter") {
                event.preventDefault()
                const row = matches[index]
                if (row) toggle(row.option)
                return
              }

              // The filter-bar idiom: backspace on an empty box takes the last
              // answer back, so clearing a menu never needs the mouse.
              if (
                event.key === "Backspace" &&
                query === "" &&
                value.length > 0
              ) {
                event.preventDefault()
                onChange(value.slice(0, -1))
              }
            }}
          />
        </div>

        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          aria-label={label}
          className="max-h-56 overflow-y-auto overscroll-contain p-1"
        >
          {matches.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            matches.map((row, position) => {
              const selected = value.includes(row.option.value)
              const isActive = position === index

              return (
                <div
                  key={row.option.value}
                  id={optionId(position)}
                  role="option"
                  aria-selected={selected}
                  ref={
                    isActive
                      ? (node) => node?.scrollIntoView({ block: "nearest" })
                      : undefined
                  }
                  // The caret stays in the search box whatever the mouse does,
                  // so a click and a ↵ leave the menu in the same state.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setActive(position)
                    toggle(row.option)
                  }}
                  onMouseMove={() => setActive(position)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm select-none ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  {/* Drawn, not a real checkbox: a focusable control in here
                      would be a tab stop inside a menu the keyboard already
                      drives from the search box. */}
                  <span
                    data-checked={selected || undefined}
                    className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground"
                  >
                    {selected && <CheckIcon className="size-3.5" />}
                  </span>
                  <span className="truncate">
                    <Highlight
                      text={row.option.label}
                      indices={row.match.indices}
                    />
                  </span>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
