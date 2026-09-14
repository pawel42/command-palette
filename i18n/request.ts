import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { routing } from "./routing"

/**
 * What every server render is told about the request's locale.
 *
 * No messages: this demo localizes its *routes*, not its copy, and the point
 * it is making — that the palette's `paths` rules are the router's own
 * pathnames — is made entirely by `routing.pathnames`. A real app returns its
 * translations here as well.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return { locale, messages: {} }
})
