import { create } from "zustand"
import type { StrategyResult, RouteSimulation } from "@/types/strategy"
import { cacheGet, cacheSet } from "@/lib/cache"

const STORAGE_KEY = "strategy"

interface StrategyStore {
  result: StrategyResult | null
  simulation: RouteSimulation | null
  isLoading: boolean
  error: string | null
  setResult: (result: StrategyResult) => void
  setSimulation: (simulation: RouteSimulation) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  hydrate: () => void
  reset: () => void
}

export const useStrategyStore = create<StrategyStore>((set) => ({
  result: null,
  simulation: null,
  isLoading: false,
  error: null,

  setResult: (result) => {
    set({ result, error: null })
    cacheSet(STORAGE_KEY, { result })
  },

  setSimulation: (simulation) => {
    set({ simulation, error: null })
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  hydrate: () => {
    if (typeof window === "undefined") return
    const saved = cacheGet<{ result: StrategyResult }>(STORAGE_KEY)
    if (saved?.result) {
      set({ result: saved.result })
    }
  },

  reset: () => set({ result: null, simulation: null, isLoading: false, error: null }),
}))
