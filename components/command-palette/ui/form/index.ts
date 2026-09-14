/**
 * Forms.
 *
 * The palette has no opinion about how a form holds its values — `render` is
 * a body of your own, and react-hook-form, TanStack Form or plain `useState`
 * all work in it untouched. These two are the places where a form and a
 * palette genuinely have to agree, and neither is the form library's to
 * settle:
 *
 *   useFormPage   the submit is ⌘↵ and a footer row, never a button
 *   claimsEscape  an overlay opened in a page owns the esc that closes it
 *
 * Both are dependency-free — see `SubmittableForm` for how the first one
 * takes a form without importing one.
 */
export { useFormPage } from "./use-form-page"
export type {
  FormPageHandle,
  FormPageOptions,
  SubmittableForm,
} from "./use-form-page"
export { claimsEscape } from "./overlay"
