import { create } from "zustand"
import type { FitScoreResult } from "@/types/strategy"
import { cacheGet, cacheSet } from "@/lib/cache"

const STORAGE_KEY = "fit-score"

interface FitScoreStore {
  result: FitScoreResult | null
  isLoading: boolean
  error: string | null
  setResult: (result: FitScoreResult) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  hydrate: () => void
  reset: () => void
}

export const useFitScoreStore = create<FitScoreStore>((set) => ({
  result: null,
  isLoading: false,
  error: null,

  setResult: (result) => {
    set({ result, error: null })
    cacheSet(STORAGE_KEY, { result })
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  hydrate: () => {
    if (typeof window === "undefined") return
    const saved = cacheGet<{ result: FitScoreResult }>(STORAGE_KEY)
    if (saved?.result) {
      set({ result: saved.result })
    }
  },

  reset: () => set({ result: null, isLoading: false, error: null }),
}))
