import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {}

/** Points the server-side config at `i18n/request.ts` and aliases it in. */
export default createNextIntlPlugin()(nextConfig)
