import type { ReactNode } from "react"

/** The bit of chrome every demo route shares: a heading and a lead. */
export function RouteIntro({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <header className="mb-8">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      <div className="mt-2 max-w-prose space-y-2 text-sm text-muted-foreground">
        {children}
      </div>
    </header>
  )
}

/** A `paths` rule, shown as what it is. */
export function Rule({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  )
}
