"use client"

import { useState } from "react"
import type { ComponentType } from "react"

import { definePage } from "@/lib/palette"
import { useNavigation, usePage } from "@/lib/palette/react"

import { logActivity } from "../activity"
import { ICONS, Icon, Kbd } from "../primitives"

/**
 * Two hand-written form pages, one pushed from the other.
 *
 * The point of the pair: neither form tells the engine anything about its
 * fields. Both are plain `useState`. Step one keeps its half-typed email while
 * step two sits on top of it, because a covered page is hidden rather than
 * unmounted — and step two hands its own values back through `resolve`, which
 * is the only channel between them.
 *
 * Both use `search: "disabled"`, so the frame's input stays in place but inert
 * and esc unwinds on the first press instead of clearing text.
 */

export type Profile = {
  name: string
  role: string
  bio: string
}

const ROLES = ["Engineering", "Design", "Product", "Support", "Other"]

const FIELD =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring"

function Label({
  children,
  text,
}: {
  children: React.ReactNode
  text: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{text}</span>
      {children}
    </label>
  )
}

/* ---------------------------------------------------------------- step two */

export const profilePage = definePage<void, Profile, ComponentType>({
  id: "profile",
  title: "Profile",
  search: "disabled",
  placeholder: "Profile — step 2 of 2",
  component: ProfileForm,
})

function ProfileForm() {
  const { resolve } = usePage(profilePage)
  const [name, setName] = useState("")
  const [role, setRole] = useState(ROLES[0])
  const [bio, setBio] = useState("")

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-muted-foreground">
        Fill this in and save — the values travel back to step one through{" "}
        <code>resolve()</code>. <Kbd>esc</Kbd> abandons them instead.
      </p>

      <Label text="Display name">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada Lovelace"
          autoFocus
          className={FIELD}
        />
      </Label>

      <Label text="Team">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className={FIELD}
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Label>

      <Label text="Bio">
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={2}
          placeholder="One line about yourself"
          className={`${FIELD} resize-none`}
        />
      </Label>

      <button
        type="button"
        onClick={() => resolve({ name: name || "Unnamed", role, bio })}
        className="flex items-center gap-2 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Icon path={ICONS.check} className="size-3.5" />
        Save profile
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------- step one */

export const accountPage = definePage<void, void, ComponentType>({
  id: "account",
  title: "New Account",
  search: "disabled",
  placeholder: "New account — step 1 of 2",
  component: AccountForm,
})

function AccountForm() {
  const nav = useNavigation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)

  const addProfile = async () => {
    const result = await nav.push(profilePage)
    // undefined when step two was abandoned with esc.
    if (result) setProfile(result)
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-muted-foreground">
        Type something, open step two, then come back — this form is still
        exactly as you left it.
      </p>

      <Label text="Email">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ada@example.com"
          autoFocus
          className={FIELD}
        />
      </Label>

      <Label text="Password">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className={FIELD}
        />
      </Label>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Profile
        </span>
        <button
          type="button"
          onClick={addProfile}
          className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon path={ICONS.user} className="size-4 text-muted-foreground" />
          <span className={profile ? undefined : "text-muted-foreground"}>
            {profile ? `${profile.name} — ${profile.role}` : "Add profile…"}
          </span>
          <Icon
            path={ICONS.chevronRight}
            className="ml-auto size-3.5 text-muted-foreground"
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            logActivity(
              `signed up “${email || "no email"}”${
                profile ? ` as ${profile.role}` : " with no profile"
              }`
            )
            nav.popToRoot()
          }}
          className="flex items-center gap-2 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Icon path={ICONS.check} className="size-3.5" />
          Create account
        </button>
        <p className="text-xs text-muted-foreground">
          <Kbd>esc</Kbd> discards everything
        </p>
      </div>
    </div>
  )
}
