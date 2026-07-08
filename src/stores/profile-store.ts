import { create } from "zustand"
import type {
  ProfileData,
  ActivityEvent,
  BookmarkRecord,
  AchievementRecord,
  PlanRecord,
  InterviewRecord,
  UserLevel,
} from "@/types/profile"
import type { CoachGoal } from "@/types/coach"
import { isPriorityActivityEventType } from "@/types/activity"
import { cacheGet, cacheSet } from "@/lib/cache"

const STORAGE_KEY = "profile"
const SESSION_KEY = "session_id"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function ensureSessionId(): string {
  if (typeof window === "undefined") return `srv-${generateId()}`
  let sid = window.sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = generateId()
    window.sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export function getSessionId(): string {
  if (typeof window === "undefined") return `srv-${generateId()}`
  let sid = window.sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = generateId()
    window.sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export function resetSession(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_KEY)
  }
}

function emptyProfile(sessionId: string): ProfileData {
  return {
    sessionId,
    level: "beginner",
    goalHistory: [],
    lastNctCodes: [],
    recommendations: [],
    savedCodes: [],
    activityLog: [],
    achievements: [],
    bookmarks: [],
    deletedBookmarkCodes: [],
    plans: [],
    interviews: [],
  }
}

let sessionIdState: string | null = null

function persistProfile(store: ProfileData): void {
  cacheSet(STORAGE_KEY, store)
}

function normalizeActivityLog(activityLog: ActivityEvent[]): ActivityEvent[] {
  return activityLog.map((event) => {
    const resolvedPriority =
      typeof event.isPriority === "boolean"
        ? event.isPriority
        : isPriorityActivityEventType(event.type)
    return {
      ...event,
      isPriority: resolvedPriority,
      priorityRank: typeof event.priorityRank === "number" ? event.priorityRank : (resolvedPriority ? 1 : 0),
    }
  })
}

function isValidGoal(goal: unknown): goal is CoachGoal {
  if (!goal || typeof goal !== "object") return false
  const candidate = goal as Partial<CoachGoal>
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.nctCode === "string"
    && candidate.nctCode.trim().length > 0
    && typeof candidate.nctTitle === "string"
    && candidate.nctTitle.trim().length > 0
}

function isValidPlan(plan: unknown): plan is PlanRecord {
  if (!plan || typeof plan !== "object") return false
  const candidate = plan as Partial<PlanRecord>
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.nctCode === "string"
    && candidate.nctCode.trim().length > 0
    && typeof candidate.nctTitle === "string"
    && candidate.nctTitle.trim().length > 0
}

function normalizeProfileData(profile: ProfileData): ProfileData {
  const activeGoal = isValidGoal(profile.activeGoal) ? profile.activeGoal : null
  const goalHistory = (profile.goalHistory ?? []).filter(isValidGoal)
  const plans = (profile.plans ?? []).filter(isValidPlan)
  const deletedBookmarkCodes = profile.deletedBookmarkCodes ?? []

  return {
    ...profile,
    activeGoal,
    activeGoalId: activeGoal?.id,
    goalHistory,
    plans,
    bookmarks: (profile.bookmarks ?? []).filter(
      (bookmark) => !deletedBookmarkCodes.includes(bookmark.nctCode),
    ),
    deletedBookmarkCodes,
    activityLog: normalizeActivityLog(profile.activityLog ?? []),
  }
}

interface ProfileStore extends ProfileData {
  hydrate: () => void
  logActivity: (type: string, label: string, isPriority?: boolean) => void
  setLevel: (level: UserLevel) => void
  setActiveGoal: (goal: CoachGoal) => void
  clearGoalWorkspace: () => void
  clearActiveGoal: () => void
  archiveActiveGoal: () => void
  updateLastCodes: (codes: string[]) => void
  setRecommendations: (items: any[]) => void
  toggleBookmark: (bookmark: Omit<BookmarkRecord, "id" | "savedAt">) => void
  removeBookmark: (id: string) => void
  acknowledgeBookmarkDeletes: (codes: string[]) => void
  upsertPlan: (plan: Omit<PlanRecord, "id" | "createdAt">) => string
  removePlan: (id: string) => void
  setActivePlan: (id: string | undefined) => void
  upsertInterview: (interview: Omit<InterviewRecord, "id" | "createdAt">) => string
  unlockAchievement: (achievement: { id: string; title: string; description: string }) => void
  syncFromServer: (data: Partial<ProfileData>) => void
}

export const useProfileStore = create<ProfileStore>((set, get) => {
  const base = emptyProfile(getSessionId())

  if (typeof window !== "undefined") {
    const saved = cacheGet<ProfileData>(STORAGE_KEY)
    if (saved && saved.sessionId) {
      const normalized = normalizeProfileData(saved)
      sessionIdState = saved.sessionId
      Object.assign(base, normalized)
    }
  }

  return {
    ...base,

    hydrate: () => {
      // no-op — hydration happens synchronously at store creation
    },

  logActivity: (type, label, isPriority) => {
    const resolvedPriority = typeof isPriority === "boolean" ? isPriority : isPriorityActivityEventType(type)
    const event: ActivityEvent = {
      id: generateId(),
      type,
      label,
      timestamp: Date.now(),
      isPriority: resolvedPriority,
      priorityRank: resolvedPriority ? 1 : 0,
    }
    set((state) => ({
      activityLog: [event, ...state.activityLog].slice(0, 500),
    }))
    persistProfile(get())
  },

  setLevel: (level) => set({ level }),

  setActiveGoal: (goal) =>
    set((state) => {
      const goalChanged = state.activeGoal?.id !== goal.id
      const history = state.activeGoal && state.activeGoal.id !== goal.id
        ? [state.activeGoal, ...state.goalHistory.filter((g) => g.id !== state.activeGoal?.id)]
        : state.goalHistory
      const nextGoal = {
        ...goal,
        status: "active" as const,
      }
      const next = {
        activeGoal: nextGoal,
        activeGoalId: nextGoal.id,
        goalHistory: history,
        plans: goalChanged
          ? state.plans.filter((plan) => plan.goalId === goal.id || plan.nctCode === goal.nctCode)
          : state.plans,
        interviews: goalChanged
          ? state.interviews.filter((interview) => interview.goalId === goal.id || interview.nctCode === goal.nctCode)
          : state.interviews,
        activePlanId: goalChanged
          ? state.plans.find((plan) => plan.goalId === goal.id || plan.nctCode === goal.nctCode)?.id
          : state.activePlanId,
        interviewResult: goalChanged
          ? state.interviews.find((interview) => interview.goalId === goal.id || interview.nctCode === goal.nctCode)
            ? state.interviewResult
            : undefined
          : state.interviewResult,
      }
      persistProfile({ ...get(), ...next } as ProfileData)
      return next
    }),

  clearGoalWorkspace: () =>
    set((state) => {
      const next = {
        activeGoal: null,
        activeGoalId: undefined,
        activePlanId: undefined,
        goalHistory: [],
        lastNctCodes: [],
        recommendations: [],
        savedCodes: [],
        plans: [],
        interviews: [],
        interviewResult: undefined,
      }
      persistProfile({ ...state, ...next } as ProfileData)
      return next
    }),

  clearActiveGoal: () =>
    set(() => {
      const next = { activeGoal: null, activeGoalId: undefined }
      persistProfile({ ...get(), ...next } as ProfileData)
      return next
    }),

  archiveActiveGoal: () =>
    set((state) => {
      if (!state.activeGoal) return state
      const archivedGoal: CoachGoal = { ...state.activeGoal, status: "archived" }
      const next = {
        activeGoal: null,
        activeGoalId: undefined,
        goalHistory: [
          archivedGoal,
          ...state.goalHistory.filter((g) => g.id !== archivedGoal.id),
        ],
      }
      persistProfile({ ...get(), ...next } as ProfileData)
      return next
    }),

  updateLastCodes: (codes) =>
    set((state) => ({
      lastNctCodes: codes,
      recommendations: [],
    })),

  setRecommendations: (items) =>
    set({
      recommendations: items,
      lastNctCodes: items.map((x: any) => x.code as string).filter(Boolean),
    }),

  toggleBookmark: (bookmark) => {
    const existing = get().bookmarks.find((b) => b.nctCode === bookmark.nctCode)
    if (existing) {
      set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== existing.id),
        deletedBookmarkCodes: Array.from(new Set([...state.deletedBookmarkCodes, existing.nctCode])),
      }))
    } else {
      const entry: BookmarkRecord = {
        id: generateId(),
        ...bookmark,
        savedAt: Date.now(),
      }
      set((state) => ({
        bookmarks: [entry, ...state.bookmarks],
        deletedBookmarkCodes: state.deletedBookmarkCodes.filter((code) => code !== entry.nctCode),
      }))
    }
    persistProfile(get())
  },

  removeBookmark: (id) => {
    set((state) => {
      const removed = state.bookmarks.find((bookmark) => bookmark.id === id)
      return {
        bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id),
        deletedBookmarkCodes: removed
          ? Array.from(new Set([...state.deletedBookmarkCodes, removed.nctCode]))
          : state.deletedBookmarkCodes,
      }
    })
    persistProfile(get())
  },

  acknowledgeBookmarkDeletes: (codes) => {
    if (codes.length === 0) return
    set((state) => ({
      deletedBookmarkCodes: state.deletedBookmarkCodes.filter((code) => !codes.includes(code)),
    }))
    persistProfile(get())
  },

  upsertPlan: (plan) => {
    const existing = get().plans.find((p) =>
      plan.goalId ? p.goalId === plan.goalId : p.nctCode === plan.nctCode,
    )
    const id = existing?.id ?? generateId()
    const entry: PlanRecord = {
      id,
      ...plan,
      createdAt: existing?.createdAt ?? Date.now(),
    }
    set((state) => ({
      plans: [entry, ...state.plans.filter((p) => p.id !== id)],
    }))
    persistProfile(get())
    return id
  },

  removePlan: (id) => {
    set((state) => ({
      plans: state.plans.filter((p) => p.id !== id),
      activePlanId: state.activePlanId === id ? undefined : state.activePlanId,
    }))
    persistProfile(get())
  },

  setActivePlan: (id) => set({ activePlanId: id }),

  upsertInterview: (interview) => {
    const existing = get().interviews.find((i) => i.nctCode === interview.nctCode)
    const id = existing?.id ?? generateId()
    const entry: InterviewRecord = {
      id,
      ...interview,
      createdAt: existing?.createdAt ?? Date.now(),
    }
    set((state) => ({
      interviews: [entry, ...state.interviews.filter((i) => i.id !== id)],
      interviewResult: {
        summary: interview.summary,
        level: interview.level,
      },
      level: interview.level ?? state.level,
    }))
    persistProfile(get())
    return id
  },

  unlockAchievement: (achievement) => {
    const store = get()
    const exists = store.achievements.some(
      (a) => a.id === (achievement as any).id && a.unlockedAt
    )
    if (exists) return
    set((state) => ({
      achievements: [
        { ...achievement, unlockedAt: Date.now() } as AchievementRecord,
        ...state.achievements.filter((a) => a.id !== (achievement as any).id),
      ],
    }))
    persistProfile(get())
  },

  syncFromServer: (data) =>
    set((state) => normalizeProfileData({
      ...state,
      ...data,
      goalHistory: data.goalHistory ?? state.goalHistory ?? [],
      sessionId: state.sessionId || getSessionId(),
    } as ProfileData)),
  }
})

export function persistStore(): void {
  persistProfile(useProfileStore.getState())
}
