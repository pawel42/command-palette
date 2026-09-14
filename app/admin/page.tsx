import Link from "next/link"

import { RouteIntro, Rule } from "../demo/prose"

export default function Admin() {
  return (
    <>
      <RouteIntro title="Admin">
        <p>
          The exception everything else is written against. Anything filed{" "}
          <Rule>[&quot;/*&quot;, &quot;!/admin/*&quot;]</Rule> is gone from here
          — the second rule covers this path too, and the last rule that covers
          the path is the one that decides.
        </p>
        <p>
          In its place: commands that exist nowhere else. &ldquo;Purge the
          CDN&rdquo; and &ldquo;Rotate Signing Keys&rdquo; are{" "}
          <Rule>[&quot;/admin/*&quot;]</Rule>, so they follow you down into{" "}
          <Link href="/admin/users" className="underline underline-offset-2">
            Users
          </Link>{" "}
          — all but one of them.
        </p>
      </RouteIntro>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Deploys today", "14"],
          ["Failed jobs", "2"],
          ["Seats used", "38 / 50"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </>
  )
}
