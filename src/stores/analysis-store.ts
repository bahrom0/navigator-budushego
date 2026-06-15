import { create } from "zustand"
import type { AnalysisStatus, AnalysisStep } from "@/types/analysis"
import { cacheGet, cacheSet, cacheRemove } from "@/lib/cache"

interface CachedAnalysisData {
  ranked: any[]
  overallConfidence: number | null
  categories: { id: string; name: string; description?: string }[]
}

interface AnalysisStore {
  status: AnalysisStatus
  currentStep: AnalysisStep
  stepIndex: number
  error: string | null
  startTime: number | null
  setStatus: (status: AnalysisStatus) => void
  setStep: (step: AnalysisStep, index: number) => void
  nextStep: () => void
  setError: (error: string | null) => void
  startAnalysis: () => void
  reset: () => void
  cacheResults: (payload: CachedAnalysisData) => void
  restoreFromCache: () => CachedAnalysisData | null
  clearCache: () => void
}

const INITIAL_STEP: AnalysisStep = "analyzing_interests"

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  status: "idle",
  currentStep: INITIAL_STEP,
  stepIndex: 0,
  error: null,
  startTime: null,

  setStatus: (status) => set({ status }),

  setStep: (step, index) => set({ currentStep: step, stepIndex: index }),

  nextStep: () => {
    const { stepIndex } = get()
    const steps: AnalysisStep[] = [
      "analyzing_interests",
      "matching_nct",
      "searching_universities",
      "forming_recommendations",
    ]
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1)
    set({ currentStep: steps[nextIndex], stepIndex: nextIndex })
  },

  setError: (error) => set({ error, status: "error" }),

  startAnalysis: () =>
    set({
      status: "running",
      currentStep: INITIAL_STEP,
      stepIndex: 0,
      error: null,
      startTime: Date.now(),
    }),

  reset: () =>
    set({
      status: "idle",
      currentStep: INITIAL_STEP,
      stepIndex: 0,
      error: null,
      startTime: null,
    }),

  cacheResults: (payload) => cacheSet("analysisResults", payload),

  restoreFromCache: () => cacheGet<CachedAnalysisData>("analysisResults"),

  clearCache: () => cacheRemove("analysisResults"),
}))
