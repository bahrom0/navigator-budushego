import { create } from "zustand"
import type {
  CoachGoal,
  CoachRoadmap,
  CoachDayPlan,
  CoachDayTask,
  CoachDiagnosticResult,
  CoachMiniTest,
  CoachMiniTestResult,
  CoachMessage,
  CoachProgress,
  CoachActiveTab,
  CoachTaskStep,
} from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"
import type { ActiveGoalBundle } from "@/types/admission"

interface CoachStore {
  bundle: ActiveGoalBundle | null
  applyBundle: (bundle: ActiveGoalBundle) => void

  goal: CoachGoal | null
  setGoal: (goal: CoachGoal) => void
  archiveGoal: () => void
  clearGoal: () => void

  plan: DevelopmentPlan | null
  setPlan: (plan: DevelopmentPlan | null) => void

  dailyHistory: DailyPlanRecord[]
  setDailyHistory: (plans: DailyPlanRecord[]) => void

  roadmap: CoachRoadmap | null
  setRoadmap: (roadmap: CoachRoadmap | null) => void
  clearRoadmap: () => void

  dayPlan: CoachDayPlan | null
  setDayPlan: (plan: CoachDayPlan | null) => void
  toggleTask: (taskId: string) => void
  persistToggleTask: (dayPlanId: string, taskId: string, completed: boolean) => Promise<void>
  clearDayPlan: () => void

  navigateDate: string
  setNavigateDate: (date: string) => void

  diagnostics: CoachDiagnosticResult[]
  addDiagnostic: (result: CoachDiagnosticResult) => void
  clearDiagnostics: () => void

  miniTests: CoachMiniTest[]
  addMiniTest: (test: CoachMiniTest) => void
  setMiniTestResult: (testId: string, result: CoachMiniTestResult) => void

  messages: CoachMessage[]
  addMessage: (msg: CoachMessage) => void
  clearMessages: () => void

  progress: CoachProgress
  updateProgress: (partial: Partial<CoachProgress>) => void
  resetProgress: () => void

  taskSteps: Record<string, CoachTaskStep[]>
  setTaskSteps: (taskId: string, steps: CoachTaskStep[]) => void

  activeTab: CoachActiveTab
  setActiveTab: (tab: CoachActiveTab) => void

  isLoading: boolean
  setLoading: (loading: boolean) => void

  error: string | null
  setError: (error: string | null) => void

  reset: () => void
}

const initialProgress: CoachProgress = {
  currentStreak: 0,
  longestStreak: 0,
  totalDaysActive: 0,
  totalTasksCompleted: 0,
  totalTasksPlanned: 0,
  roadmapCompletionPercent: 0,
  lastActiveDate: "",
  subjectLevels: [],
}

export const useCoachStore = create<CoachStore>((set, get) => ({
  bundle: null,
  applyBundle: (bundle) =>
    set({
      bundle,
      goal: bundle.goal,
      plan: bundle.generalPlan,
      roadmap: bundle.roadmap,
      dayPlan: bundle.todayPlan
        ? {
            date: bundle.todayPlan.planDate,
            weekId: bundle.todayPlan.weekId,
            tasks: bundle.todayPlan.tasks,
            dailyPlanId: bundle.todayPlan.id,
            roadmapId: bundle.todayPlan.roadmapId,
            goalId: bundle.todayPlan.goalId,
            weekNumber: bundle.todayPlan.weekNumber,
            title: bundle.todayPlan.title,
            completedTaskIds: bundle.todayPlan.completedTaskIds,
            skippedTaskIds: bundle.todayPlan.skippedTaskIds,
            previousDate: bundle.todayPlan.previousDate,
            nextDate: bundle.todayPlan.nextDate,
            completedAt: bundle.todayPlan.updatedAt,
            stats: bundle.todayPlan.stats,
          }
        : null,
      dailyHistory: bundle.history,
      error: null,
    }),

  goal: null,
  setGoal: (goal) => set({ goal, error: null }),
  archiveGoal: () =>
    set((state) =>
      state.goal ? { goal: { ...state.goal, status: "changed" } } : state,
    ),
  clearGoal: () => set({ goal: null }),

  plan: null,
  setPlan: (plan) => set({ plan }),

  dailyHistory: [],
  setDailyHistory: (plans) => set({ dailyHistory: plans }),

  roadmap: null,
  setRoadmap: (roadmap) => set({ roadmap, error: null }),
  clearRoadmap: () => set({ roadmap: null }),

  dayPlan: null,
  setDayPlan: (plan) => set({ dayPlan: plan, error: null }),
  toggleTask: (taskId) =>
    set((state) => {
      if (!state.dayPlan) return state
      const tasks: CoachDayTask[] = state.dayPlan.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? Date.now() : undefined,
            }
          : t,
      )
      return { dayPlan: { ...state.dayPlan, tasks } }
    }),
  persistToggleTask: async (dayPlanId: string, taskId: string, completed: boolean) => {
    const state = get()
    try {
      const res = await fetch("/api/coach/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayPlanId,
          taskId,
          completed,
          currentProgress: state.progress,
        }),
      })
      const payload = (await res.json()) as { status?: string; data?: { progress?: CoachProgress }; error?: string }
      if (res.ok && payload.status === "success" && payload.data?.progress) {
        set({ progress: payload.data.progress })
      }
    } catch (err) {
      console.error("[coach-store] Failed to persist task toggle:", err)
    }
  },
  clearDayPlan: () => set({ dayPlan: null }),

  navigateDate: new Date().toISOString().slice(0, 10),
  setNavigateDate: (date) => set({ navigateDate: date }),

  diagnostics: [],
  addDiagnostic: (result) =>
    set((state) => ({ diagnostics: [result, ...state.diagnostics] })),
  clearDiagnostics: () => set({ diagnostics: [] }),

  miniTests: [],
  addMiniTest: (test) =>
    set((state) => {
      const existing = state.miniTests.find((t) => t.id === test.id)
      if (existing) {
        return {
          miniTests: state.miniTests.map((t) => (t.id === test.id ? test : t)),
        }
      }
      return { miniTests: [test, ...state.miniTests] }
    }),
  setMiniTestResult: (testId, result) =>
    set((state) => ({
      miniTests: state.miniTests.map((t) =>
        t.id === testId ? { ...t, result } : t,
      ),
    })),

  messages: [],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  progress: initialProgress,
  updateProgress: (partial) =>
    set((state) => ({ progress: { ...state.progress, ...partial } })),
  resetProgress: () => set({ progress: initialProgress }),

  taskSteps: {},
  setTaskSteps: (taskId, steps) =>
    set((state) => ({ taskSteps: { ...state.taskSteps, [taskId]: steps } })),

  activeTab: "today",
  setActiveTab: (tab) => set({ activeTab: tab }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  error: null,
  setError: (error) => set({ error }),

    reset: () =>
    set({
      bundle: null,
      goal: null,
      plan: null,
      roadmap: null,
      dayPlan: null,
      dailyHistory: [],
      navigateDate: new Date().toISOString().slice(0, 10),
      diagnostics: [],
      miniTests: [],
      messages: [],
      progress: initialProgress,
      taskSteps: {},
      activeTab: "today",
      isLoading: false,
      error: null,
    }),
}))
