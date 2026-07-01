"use client"

import { MoonStar, SunMedium } from "lucide-react"
import { motion } from "framer-motion"
import { resolveTheme } from "@/lib/theme"
import { useThemeStore } from "@/stores/theme-store"

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const systemTheme = useThemeStore((s) => s.systemTheme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const resolved = resolveTheme(mode, systemTheme)

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={toggleTheme}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card-bg px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
      aria-label={`Тема: ${resolved === "dark" ? "тёмная" : "светлая"}. Нажмите, чтобы переключить.`}
      title={`Текущая тема: ${resolved === "dark" ? "тёмная" : "светлая"}`}
    >
      {resolved === "dark" ? (
        <MoonStar className="h-3.5 w-3.5 text-primary" />
      ) : (
        <SunMedium className="h-3.5 w-3.5 text-primary" />
      )}
      <span className="hidden sm:inline">
        {mode === "system" ? "Системная" : resolved === "dark" ? "Тёмная" : "Светлая"}
      </span>
    </motion.button>
  )
}

