import { create } from "zustand"
import {
  THEME_STORAGE_KEY,
  type ThemeMode,
  type ResolvedTheme,
  getSystemTheme,
  isThemeMode,
  resolveTheme,
} from "@/lib/theme"

interface ThemeStore {
  mode: ThemeMode
  systemTheme: ResolvedTheme
  hydrated: boolean
  hydrate: () => void
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  setSystemTheme: (theme: ResolvedTheme) => void
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(stored) ? stored : "system"
}

function persistMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(THEME_STORAGE_KEY, mode)
}

function applyResolvedTheme(mode: ThemeMode, systemTheme: ResolvedTheme): void {
  const theme = resolveTheme(mode, systemTheme)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  systemTheme: "light",
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return
    const mode = readStoredMode()
    const systemTheme = getSystemTheme()
    set({ mode, systemTheme, hydrated: true })
    applyResolvedTheme(mode, systemTheme)
  },

  setMode: (mode) => {
    const systemTheme = get().systemTheme
    set({ mode, hydrated: true })
    persistMode(mode)
    applyResolvedTheme(mode, systemTheme)
  },

  toggleTheme: () => {
    const { mode, systemTheme } = get()
    const resolved = resolveTheme(mode, systemTheme)
    const nextMode: ThemeMode = resolved === "dark" ? "light" : "dark"
    set({ mode: nextMode, hydrated: true })
    persistMode(nextMode)
    applyResolvedTheme(nextMode, systemTheme)
  },

  setSystemTheme: (theme) => {
    const current = get()
    set({ systemTheme: theme })
    if (current.mode === "system") {
      applyResolvedTheme("system", theme)
    }
  },
}))

