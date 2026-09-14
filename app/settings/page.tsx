import { RouteIntro, Rule } from "../demo/prose"

export default function Settings() {
  return (
    <>
      <RouteIntro title="Settings">
        <p>
          One exact path, no subtree. &ldquo;Export Your Data&rdquo; is{" "}
          <Rule>[&quot;/settings&quot;]</Rule> and appears nowhere else; it has
          no shortcut anywhere else either, which is the half of this that is
          easy to forget — an unavailable command is not a hidden row, it is a
          command that is not there.
        </p>
        <p>
          Try ⌘⇧E from Home and then from here. Same keys, and only one of them
          does anything.
        </p>
      </RouteIntro>

      <div className="space-y-4 text-sm">
        {[
          ["Theme", "Follows the palette's own toggle — ⌘D, anywhere."],
          ["Notifications", "Weekly digest, Mondays."],
          ["Data", "Export is a palette command on this page only."],
        ].map(([label, detail]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <p className="font-medium">{label}</p>
            <p className="mt-1 text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
    </>
  )
}
