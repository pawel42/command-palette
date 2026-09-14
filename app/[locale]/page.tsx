import { RouteIntro, Rule } from "../demo/prose"

export default function Home() {
  return (
    <>
      <RouteIntro title="Home">
        <p>
          One palette, mounted once in the shell and handed the app&rsquo;s{" "}
          <Rule>routing</Rule> config — the same one the router uses. Every
          command declares where it exists in those pathnames, and nothing
          exists until it says so: there is no default that means
          &ldquo;everywhere&rdquo; except the one you write, <Rule>{"/*"}</Rule>
          .
        </p>
        <p>
          Walk the nav with ⌘K open and watch the list change under you — the
          &ldquo;Go to&rdquo; rows do it without closing the palette, which is
          the quickest way to see a rule take effect. The two columns below say
          what to expect before you press anything. Switch to <Rule>de</Rule> up
          in the corner and nothing about them moves: the URL becomes{" "}
          <code className="font-mono">/de/verwaltung</code>, and the rule is
          still <Rule>{'"/admin"'}</Rule>.
        </p>
      </RouteIntro>

      <dl className="space-y-3 text-sm">
        <Line rule={`["/*"]`}>everywhere there is</Line>
        <Line rule={`["/*", "!/admin/*"]`}>
          everywhere except the admin area — the later rule wins where both
          apply
        </Line>
        <Line rule={`["/admin/*"]`}>
          <code className="font-mono">/admin</code> and everything under it
        </Line>
        <Line rule={`["/admin/*", "!/admin/users"]`}>
          the admin area with one page cut back out of it
        </Line>
        <Line rule={`["/projects/[id]"]`}>
          one dynamic route: <code className="font-mono">/projects/atlas</code>{" "}
          matches, <code className="font-mono">/projects</code> does not
        </Line>
        <Line rule={`["/"]`}>this page, and nowhere else</Line>
      </dl>
    </>
  )
}

function Line({ rule, children }: { rule: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[16rem_1fr] sm:gap-4">
      <dt>
        <Rule>{rule}</Rule>
      </dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  )
}
