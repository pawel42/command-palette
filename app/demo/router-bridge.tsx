"use client"

import { useEffect } from "react"

import { useRouter } from "@/i18n/navigation"

/**
 * The same trick as the theme bridge: commands are plain data and cannot call
 * hooks, so the router is published here for as long as the palette is
 * mounted. Navigating from the palette is what makes the rules visible —
 * the list you are looking at is rebuilt under you the moment the path moves.
 *
 * It is the localized router, so a destination is named the way a `paths` rule
 * names it — `"/projects"`, or `{ pathname: "/projects/[id]", params: { id } }`
 * — and which URL that turns into is the routing config's business.
 */
type Router = ReturnType<typeof useRouter>

/** Every destination there is, typed off the routing config. */
export type Destination = Parameters<Router["push"]>[0]

let go: ((href: Destination) => void) | null = null

export function navigate(href: Destination) {
  go?.(href)
}

export function RouterCommandBridge() {
  const router = useRouter()

  useEffect(() => {
    go = (href) => router.push(href)
    return () => {
      go = null
    }
  }, [router])

  return null
}
