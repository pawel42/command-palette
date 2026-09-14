import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { Geist_Mono, Inter } from "next/font/google"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { AppShell } from "../shell"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

/** Every locale, rendered ahead of time — see `setRequestLocale` below. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // The proxy only ever routes a known locale here; anything else is someone
  // typing a URL, and there is no page at it.
  if (!hasLocale(routing.locales, locale)) notFound()

  // Puts the locale where the server hooks can find it without a request, so
  // this tree can be rendered statically.
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        {/* The locale every client component below reads — `usePathname()` in
            the nav and inside the palette needs it to know which of the
            localized pathnames it is looking at. */}
        <NextIntlClientProvider>
          <ThemeProvider>
            {/* Marked inert while the palette is open — see `useModalShell`. */}
            <div data-app-shell>
              <AppShell>{children}</AppShell>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
