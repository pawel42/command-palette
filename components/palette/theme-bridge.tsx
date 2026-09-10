"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

/**
 * Commands are plain data, so they can't call hooks. This publishes the theme
 * toggle for as long as the palette is mounted.
 */
let toggle: (() => void) | null = null

export function toggleTheme() {
  toggle?.()
}

export function ThemeCommandBridge() {
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")
    return () => {
      toggle = null
    }
  }, [resolvedTheme, setTheme])

  return null
}
