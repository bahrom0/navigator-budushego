export type ThemeMode = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "mmt-theme-mode"

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark"
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === "system" ? systemTheme : mode
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

