import { RouteIntro, Rule } from "../../demo/prose"

const USERS = [
  ["Ada Lovelace", "Owner"],
  ["Grace Hopper", "Admin"],
  ["Alan Turing", "Member"],
  ["Radia Perlman", "Member"],
]

export default function Users() {
  return (
    <>
      <RouteIntro title="Users">
        <p>
          One level deeper into the admin area, so everything{" "}
          <Rule>[&quot;/admin/*&quot;]</Rule> came along.
        </p>
        <p>
          Except &ldquo;Rotate Signing Keys&rdquo;, which is{" "}
          <Rule>[&quot;/admin/*&quot;, &quot;!/admin/users&quot;]</Rule> — a
          subtree with a single page cut back out of it. That is the same
          last-rule-wins reading as <Rule>!/admin/*</Rule>, one level finer.
        </p>
      </RouteIntro>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {USERS.map(([name, role]) => (
            <tr key={name} className="border-b border-border/50">
              <td className="py-2">{name}</td>
              <td className="py-2 text-muted-foreground">{role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
