import { create } from "zustand"
import { OnboardingData, DEFAULT_ONBOARDING_DATA, OnboardingStep, ONBOARDING_STEPS } from "@/types/onboarding"

const STORAGE_KEY = "nct-nav:onboarding-state"

interface OnboardingState {
  currentStep: OnboardingStep
  data: OnboardingData
  _loaded: boolean
  hydrate: () => void
  setData: (data: Partial<OnboardingData>) => void
  setInterests: (interests: string[]) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

function loadFromStorage(): Partial<OnboardingState> | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<OnboardingState>
  } catch {
    return null
  }
}

function saveToStorage(state: OnboardingState): void {
  if (typeof window === "undefined") return
  try {
    const { _loaded, ...toSave } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // quota exceeded or private mode
  }
}

function removeFromStorage(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: ONBOARDING_STEPS[0],
  data: { ...DEFAULT_ONBOARDING_DATA },
  _loaded: false,

  hydrate: () => {
    const saved = loadFromStorage()
    set((state) => ({
      currentStep: saved?.currentStep ?? state.currentStep ?? ONBOARDING_STEPS[0],
      data: { ...DEFAULT_ONBOARDING_DATA, ...saved?.data },
      _loaded: true,
    }))
  },

  setData: (data) => {
    set((state) => {
      const next = { data: { ...state.data, ...data } }
      saveToStorage({ ...state, ...next })
      return next
    })
  },

  setInterests: (interests) => {
    set((state) => {
      const next = { data: { ...state.data, interests } }
      saveToStorage({ ...state, ...next })
      return next
    })
  },

  nextStep: () => {
    const { currentStep } = get()
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep)
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      set((state) => {
        const next = { currentStep: ONBOARDING_STEPS[currentIndex + 1] }
        saveToStorage({ ...state, ...next })
        return next
      })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep)
    if (currentIndex > 0) {
      set((state) => {
        const next = { currentStep: ONBOARDING_STEPS[currentIndex - 1] }
        saveToStorage({ ...state, ...next })
        return next
      })
    }
  },

  reset: () => {
    removeFromStorage()
    set({
      currentStep: ONBOARDING_STEPS[0],
      data: DEFAULT_ONBOARDING_DATA,
      _loaded: true,
    })
  },
}))

export function hydrateOnboardingStore(): boolean {
  useOnboardingStore.getState().hydrate()
  return true
}

export function resetOnboarding(): void {
  useOnboardingStore.getState().reset()
}
