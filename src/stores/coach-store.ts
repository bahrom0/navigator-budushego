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
import { cacheGet, cacheRemove, cacheSet } from "@/lib/cache"

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
  setMiniTests: (tests: CoachMiniTest[]) => void
  addMiniTest: (test: CoachMiniTest) => void
  setMiniTestResult: (testId: string, result: CoachMiniTestResult) => void

  messages: CoachMessage[]
  setMessages: (messages: CoachMessage[]) => void
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

const STORAGE_KEY = "coach-state-v1"

type PersistedCoachState = Pick<
  CoachStore,
  | "goal"
  | "plan"
  | "dailyHistory"
  | "roadmap"
  | "dayPlan"
  | "navigateDate"
  | "diagnostics"
  | "miniTests"
  | "messages"
  | "progress"
  | "activeTab"
>

function buildPersistedState(state: Partial<CoachStore>): PersistedCoachState {
  return {
    goal: state.goal ?? null,
    plan: state.plan ?? null,
    dailyHistory: Array.isArray(state.dailyHistory) ? state.dailyHistory : [],
    roadmap: state.roadmap ?? null,
    dayPlan: state.dayPlan ?? null,
    navigateDate: state.navigateDate ?? new Date().toISOString().slice(0, 10),
    diagnostics: Array.isArray(state.diagnostics) ? state.diagnostics : [],
    miniTests: Array.isArray(state.miniTests) ? state.miniTests : [],
    messages: Array.isArray(state.messages) ? state.messages : [],
    progress: state.progress ?? initialProgress,
    activeTab: state.activeTab ?? "today",
  }
}

function persistCoachState(state: Partial<CoachStore>): void {
  cacheSet(STORAGE_KEY, buildPersistedState(state))
}

export const useCoachStore = create<CoachStore>((set, get) => {
  const persisted = buildPersistedState(cacheGet<PersistedCoachState>(STORAGE_KEY) ?? {})

  return {
  bundle: null,
  applyBundle: (bundle) =>
    set((state) => {
      const next = {
        ...state,
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
              generationContext: bundle.todayPlan.generationContext,
              isDraft: bundle.todayPlan.isDraft,
            }
          : null,
        dailyHistory: bundle.dailyHistory,
        error: null,
      }
      persistCoachState(next)
      return next
    }),

  goal: persisted.goal,
  setGoal: (goal) => set((state) => {
    const next = { ...state, goal, error: null }
    persistCoachState(next)
    return next
  }),
  archiveGoal: () =>
    set((state) => {
      if (!state.goal) return state
      const next = { ...state, goal: { ...state.goal, status: "changed" as const } }
      persistCoachState(next)
      return next
    }),
  clearGoal: () => set((state) => {
    const next = { ...state, goal: null }
    persistCoachState(next)
    return next
  }),

  plan: persisted.plan,
  setPlan: (plan) => set((state) => {
    const next = { ...state, plan }
    persistCoachState(next)
    return next
  }),

  dailyHistory: persisted.dailyHistory,
  setDailyHistory: (plans) => set((state) => {
    const next = { ...state, dailyHistory: plans }
    persistCoachState(next)
    return next
  }),

  roadmap: persisted.roadmap,
  setRoadmap: (roadmap) => set((state) => {
    const next = { ...state, roadmap, error: null }
    persistCoachState(next)
    return next
  }),
  clearRoadmap: () => set((state) => {
    const next = { ...state, roadmap: null }
    persistCoachState(next)
    return next
  }),

  dayPlan: persisted.dayPlan,
  setDayPlan: (plan) => set((state) => {
    const next = { ...state, dayPlan: plan, error: null }
    persistCoachState(next)
    return next
  }),
  toggleTask: (taskId) =>
    set((state) => {
      if (!state.dayPlan) return state
      const toggledTask = state.dayPlan.tasks.find((t) => t.id === taskId)
      if (!toggledTask) return state

      const nextCompleted = !toggledTask.completed
      const tasks: CoachDayTask[] = state.dayPlan.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? Date.now() : undefined,
            }
          : t,
      )

      const completedTaskIds = tasks.filter((task) => task.completed).map((task) => task.id)
      const nextDayPlan = { ...state.dayPlan, tasks, completedTaskIds }

      const next = {
        ...state,
        dayPlan: nextDayPlan,
        dailyHistory: state.dailyHistory.map((plan) =>
          plan.id === state.dayPlan?.dailyPlanId || plan.planDate === state.dayPlan?.date
            ? {
                ...plan,
                tasks,
                completedTaskIds,
                updatedAt: Date.now(),
                isDraft: false,
              }
            : plan,
        ),
      }
      persistCoachState(next)
      return next
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
        set((state) => {
          const next = { ...state, progress: payload.data?.progress ?? state.progress }
          persistCoachState(next)
          return next
        })
      }
    } catch (err) {
      console.error("[coach-store] Failed to persist task toggle:", err)
    }
  },
  clearDayPlan: () => set((state) => {
    const next = { ...state, dayPlan: null }
    persistCoachState(next)
    return next
  }),

  navigateDate: persisted.navigateDate,
  setNavigateDate: (date) => set((state) => {
    const next = { ...state, navigateDate: date }
    persistCoachState(next)
    return next
  }),

  diagnostics: persisted.diagnostics,
  addDiagnostic: (result) =>
    set((state) => {
      const next = { ...state, diagnostics: [result, ...state.diagnostics] }
      persistCoachState(next)
      return next
    }),
  clearDiagnostics: () => set((state) => {
    const next = { ...state, diagnostics: [] }
    persistCoachState(next)
    return next
  }),

  miniTests: persisted.miniTests,
  setMiniTests: (tests) =>
    set((state) => {
      const next = { ...state, miniTests: tests }
      persistCoachState(next)
      return next
    }),
  addMiniTest: (test) =>
    set((state) => {
      const existing = state.miniTests.find((t) => t.id === test.id)
      const next = existing
        ? {
            ...state,
            miniTests: state.miniTests.map((t) => (t.id === test.id ? test : t)),
          }
        : {
            ...state,
            miniTests: [test, ...state.miniTests],
          }
      persistCoachState(next)
      return next
    }),
  setMiniTestResult: (testId, result) =>
    set((state) => {
      const next = {
        ...state,
        miniTests: state.miniTests.map((t) =>
          t.id === testId ? { ...t, result } : t,
        ),
        messages: state.messages.map((message) =>
          message.miniTest?.id === testId
            ? {
                ...message,
                miniTest: {
                  ...message.miniTest,
                  result,
                },
              }
            : message,
        ),
      }
      persistCoachState(next)
      return next
    }),

  messages: persisted.messages,
  setMessages: (messages) =>
    set((state) => {
      const next = { ...state, messages }
      persistCoachState(next)
      return next
    }),
  addMessage: (msg) =>
    set((state) => {
      const next = { ...state, messages: [...state.messages, msg] }
      persistCoachState(next)
      return next
    }),
  clearMessages: () => set((state) => {
    const next = { ...state, messages: [] }
    persistCoachState(next)
    return next
  }),

  progress: persisted.progress,
  updateProgress: (partial) =>
    set((state) => {
      const next = { ...state, progress: { ...state.progress, ...partial } }
      persistCoachState(next)
      return next
    }),
  resetProgress: () => set((state) => {
    const next = { ...state, progress: initialProgress }
    persistCoachState(next)
    return next
  }),

  taskSteps: {},
  setTaskSteps: (taskId, steps) =>
    set((state) => ({ taskSteps: { ...state.taskSteps, [taskId]: steps } })),

  activeTab: persisted.activeTab,
  setActiveTab: (tab) => set((state) => {
    const next = { ...state, activeTab: tab }
    persistCoachState(next)
    return next
  }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  error: null,
  setError: (error) => set({ error }),

  reset: () => {
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
    })
    cacheRemove(STORAGE_KEY)
  },
  }
})
