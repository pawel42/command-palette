"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import type { AppPath } from "../routes"

/**
 * The same trick as the theme bridge: commands are plain data and cannot call
 * hooks, so the router is published here for as long as the palette is
 * mounted. Navigating from the palette is what makes the rules visible —
 * the list you are looking at is rebuilt under you the moment the path moves.
 */
let go: ((href: string) => void) | null = null

/** A concrete href, so the dynamic route is spelled out by the caller. */
export function navigate(href: AppPath | `/projects/${string}`) {
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
