"use client"

import { motion } from "framer-motion"
import { MoonStar, SunMedium } from "lucide-react"
import { resolveTheme } from "@/lib/theme"
import { useThemeStore } from "@/stores/theme-store"

type ThemeToggleProps = {
  className?: string
  showLabel?: boolean
  variant?: "default" | "marketing"
}

export function ThemeToggle({
  className,
  showLabel = true,
  variant = "default",
}: ThemeToggleProps) {
  const mode = useThemeStore((s) => s.mode)
  const systemTheme = useThemeStore((s) => s.systemTheme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const resolved = resolveTheme(mode, systemTheme)
  const isDark = resolved === "dark"

  const baseClassName =
    variant === "marketing"
      ? "group relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface)] text-[var(--marketing-foreground)] shadow-[0_10px_24px_rgba(32,28,24,0.09)] backdrop-blur-xl transition duration-200 hover:scale-[1.02] hover:border-[var(--marketing-border-strong)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.32)]"
      : "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card-bg px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-background"

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={toggleTheme}
      className={[baseClassName, className].filter(Boolean).join(" ")}
      aria-label={`Тема: ${isDark ? "тёмная" : "светлая"}. Нажмите, чтобы переключить.`}
      title={`Текущая тема: ${isDark ? "тёмная" : "светлая"}`}
    >
      {variant === "marketing" ? (
        <>
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_70%)] opacity-80 dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_72%)]" />
          <span className="relative flex items-center justify-center">
            {isDark ? (
              <MoonStar className="h-[18px] w-[18px] text-[var(--marketing-foreground)]" />
            ) : (
              <SunMedium className="h-[18px] w-[18px] text-[var(--marketing-foreground)]" />
            )}
          </span>
          {/* <span className="" /> */}
          <span className="sr-only">Переключить тему</span>
        </>
      ) : (
        <>
          {isDark ? (
            <MoonStar className="h-3.5 w-3.5 text-primary" />
          ) : (
            <SunMedium className="h-3.5 w-3.5 text-primary" />
          )}
          {showLabel ? (
            <span className="hidden sm:inline">
              {mode === "system" ? "Системная" : isDark ? "Тёмная" : "Светлая"}
            </span>
          ) : null}
        </>
      )}
    </motion.button>
  )
}
