import createMiddleware from "next-intl/middleware"

import { routing } from "./i18n/routing"

/**
 * Resolves the locale for every incoming request and rewrites the localized
 * URL onto the internal route — `/de/projekte/atlas` becomes
 * `/[locale]/projects/[id]`. Next 16 calls this file `proxy.ts`; it is what
 * earlier versions called middleware, and `createMiddleware` is the same
 * `(request) => response` either way.
 */
export default createMiddleware(routing)

export const config = {
  // Everything but the internals and anything with a file extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
