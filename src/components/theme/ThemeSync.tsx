"use client"

import { useEffect } from "react"
import { useThemeStore } from "@/stores/theme-store"
import { applyTheme } from "@/lib/theme"

export function ThemeSync() {
  const mode = useThemeStore((s) => s.mode)
  const systemTheme = useThemeStore((s) => s.systemTheme)
  const hydrate = useThemeStore((s) => s.hydrate)
  const setSystemTheme = useThemeStore((s) => s.setSystemTheme)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const updateSystemTheme = () => {
      setSystemTheme(mql.matches ? "dark" : "light")
    }

    updateSystemTheme()
    mql.addEventListener("change", updateSystemTheme)
    return () => mql.removeEventListener("change", updateSystemTheme)
  }, [setSystemTheme])

  useEffect(() => {
    applyTheme(mode === "system" ? systemTheme : mode)
  }, [mode, systemTheme])

  return null
}

