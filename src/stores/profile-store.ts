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
    lastNctCodes: [],
    recommendations: [],
    savedCodes: [],
    activityLog: [],
    achievements: [],
    bookmarks: [],
    plans: [],
    interviews: [],
  }
}

let sessionIdState: string | null = null

function persistProfile(store: ProfileData): void {
  cacheSet(STORAGE_KEY, store)
}

interface ProfileStore extends ProfileData {
  hydrate: () => void
  logActivity: (type: string, label: string) => void
  setLevel: (level: UserLevel) => void
  updateLastCodes: (codes: string[]) => void
  setRecommendations: (items: any[]) => void
  toggleBookmark: (bookmark: Omit<BookmarkRecord, "id" | "savedAt">) => void
  removeBookmark: (id: string) => void
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
      sessionIdState = saved.sessionId
      Object.assign(base, saved)
    }
  }

  return {
    ...base,

    hydrate: () => {
      // no-op — hydration happens synchronously at store creation
    },

  logActivity: (type, label) => {
    const event: ActivityEvent = {
      id: generateId(),
      type,
      label,
      timestamp: Date.now(),
    }
    set((state) => ({
      activityLog: [event, ...state.activityLog].slice(0, 500),
    }))
    persistProfile(get())
  },

  setLevel: (level) => set({ level }),

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
      set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== existing.id) }))
    } else {
      const entry: BookmarkRecord = {
        id: generateId(),
        ...bookmark,
        savedAt: Date.now(),
      }
      set((state) => ({ bookmarks: [entry, ...state.bookmarks] }))
    }
    persistProfile(get())
  },

  removeBookmark: (id) => {
    set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) }))
    persistProfile(get())
  },

  upsertPlan: (plan) => {
    const existing = get().plans.find((p) => p.nctCode === plan.nctCode)
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
    set((state) => ({
      ...state,
      ...data,
      sessionId: state.sessionId || getSessionId(),
    })),
  }
})

export function persistStore(): void {
  persistProfile(useProfileStore.getState())
}
