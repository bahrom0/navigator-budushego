"use client"

import { useEffect, useRef } from "react"
import { useProfileStore, getSessionId } from "@/stores/profile-store"
import { useAuthStore } from "@/stores/auth-store"
import { loadProfile, saveProfile } from "@/lib/chat/db"
import type { ProfileData, ActivityEvent } from "@/types/profile"
import { isPriorityActivityEventType } from "@/types/activity"
import type { CoachGoal } from "@/types/coach"
import { createProfileSyncPayload } from "@/lib/profile-sync"

function parseJSONArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidGoal(goal: unknown): goal is CoachGoal {
  if (!goal || typeof goal !== "object") return false
  const candidate = goal as Partial<CoachGoal>
  return isNonEmptyString(candidate.id)
    && isNonEmptyString(candidate.nctCode)
    && isNonEmptyString(candidate.nctTitle)
}

function isValidPlan(plan: unknown): boolean {
  if (!plan || typeof plan !== "object") return false
  const candidate = plan as { id?: unknown; nctCode?: unknown; nctTitle?: unknown }
  return isNonEmptyString(candidate.id)
    && isNonEmptyString(candidate.nctCode)
    && isNonEmptyString(candidate.nctTitle)
}

function sanitizeProfile(profile: ProfileData): ProfileData {
  const activeGoal = isValidGoal(profile.activeGoal) ? profile.activeGoal : null
  const deletedBookmarkCodes = profile.deletedBookmarkCodes ?? []
  return {
    ...profile,
    activeGoal,
    activeGoalId: activeGoal?.id,
    goalHistory: (profile.goalHistory ?? []).filter(isValidGoal),
    plans: (profile.plans ?? []).filter(isValidPlan),
    bookmarks: (profile.bookmarks ?? []).filter((bookmark) =>
      isNonEmptyString(bookmark.nctCode)
      && isNonEmptyString(bookmark.nctTitle)
      && !deletedBookmarkCodes.includes(bookmark.nctCode)),
    deletedBookmarkCodes,
    interviews: (profile.interviews ?? []).filter((interview) => isNonEmptyString(interview.nctCode) && isNonEmptyString(interview.nctTitle)),
  }
}

function mergeProfile(local: ProfileData, server: ProfileData): ProfileData {
  const safeLocal = sanitizeProfile(local)
  const safeServer = sanitizeProfile(server)
  const localIds = new Set(safeLocal.bookmarks.map((b) => b.nctCode))
  const deletedBookmarkCodes = new Set(safeLocal.deletedBookmarkCodes)
  const mergedBookmarks = [
    ...safeLocal.bookmarks,
    ...safeServer.bookmarks.filter((b) =>
      !localIds.has(b.nctCode) && !deletedBookmarkCodes.has(b.nctCode)),
  ]

  const planByDomainKey = new Map<string, typeof safeLocal.plans[0]>()
  const planKey = (plan: typeof safeLocal.plans[0]) =>
    `${plan.goalId ?? `nct:${plan.nctCode}`}:${plan.planType ?? "general"}`
  for (const plan of safeServer.plans) planByDomainKey.set(planKey(plan), plan)
  for (const plan of safeLocal.plans) {
    const serverPlan = planByDomainKey.get(planKey(plan))
    planByDomainKey.set(planKey(plan), {
      ...serverPlan,
      ...plan,
      id: serverPlan?.id ?? plan.id,
      createdAt: serverPlan?.createdAt ?? plan.createdAt,
    })
  }
  const mergedPlans = Array.from(planByDomainKey.values())

  const achievementIds = new Set(safeLocal.achievements.map((a) => a.id))
  const mergedAchievements = [
    ...safeLocal.achievements,
    ...safeServer.achievements.filter((a) => !achievementIds.has(a.id)),
  ]

  const interviewByCode = new Map<string, typeof safeLocal.interviews[0]>()
  for (const interview of safeServer.interviews) interviewByCode.set(interview.nctCode, interview)
  for (const interview of safeLocal.interviews) {
    const serverInterview = interviewByCode.get(interview.nctCode)
    interviewByCode.set(interview.nctCode, {
      ...serverInterview,
      ...interview,
      id: serverInterview?.id ?? interview.id,
      goalId: interview.goalId ?? serverInterview?.goalId,
      createdAt: serverInterview?.createdAt ?? interview.createdAt,
    })
  }
  const mergedInterviews = Array.from(interviewByCode.values())

  const activityById = new Map<string, ActivityEvent>()
  for (const event of safeServer.activityLog) activityById.set(event.id, event)
  for (const event of safeLocal.activityLog) activityById.set(event.id, event)
  const mergedActivity = Array.from(activityById.values())
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 500)

  return sanitizeProfile({
    ...safeServer,
    ...safeLocal,
    bookmarks: mergedBookmarks,
    deletedBookmarkCodes: safeLocal.deletedBookmarkCodes,
    plans: mergedPlans,
    achievements: mergedAchievements,
    interviews: mergedInterviews,
    activityLog: mergedActivity,
    sessionId: safeLocal.sessionId || safeServer.sessionId || getSessionId(),
  })
}

function normalizeActivityEvent(event: any): ActivityEvent {
  const isPriority =
    typeof event.is_priority === "boolean"
      ? event.is_priority
      : isPriorityActivityEventType(String(event.event_type ?? event.type ?? ""))
  const rawTimestamp =
    event.created_at ??
    event.timestamp ??
    event.metadata?.timestamp ??
    Date.now()
  return {
    id: String(event.client_event_id ?? event.id ?? ""),
    type: String(event.event_type ?? event.type ?? ""),
    label: String(event.label ?? ""),
    timestamp: new Date(rawTimestamp).getTime(),
    isPriority,
    priorityRank: typeof event.priority_rank === "number" ? event.priority_rank : (isPriority ? 1 : 0),
  }
}

function extractProfile(state: Record<string, unknown>): ProfileData {
  return sanitizeProfile({
    sessionId: (state.sessionId as string) ?? "",
    level: (state.level as ProfileData["level"]) ?? "beginner",
    activeGoalId: state.activeGoalId as string | undefined,
    activeGoal: (state.activeGoal as ProfileData["activeGoal"]) ?? null,
    goalHistory: (state.goalHistory as ProfileData["goalHistory"]) ?? [],
    lastNctCodes: (state.lastNctCodes as string[]) ?? [],
    recommendations: (state.recommendations as any[]) ?? [],
    savedCodes: (state.savedCodes as string[]) ?? [],
    activityLog: (state.activityLog as ProfileData["activityLog"]) ?? [],
    achievements: (state.achievements as ProfileData["achievements"]) ?? [],
    activePlanId: state.activePlanId as string | undefined,
    interviewResult: state.interviewResult as ProfileData["interviewResult"],
    bookmarks: (state.bookmarks as ProfileData["bookmarks"]) ?? [],
    deletedBookmarkCodes: (state.deletedBookmarkCodes as string[]) ?? [],
    plans: (state.plans as ProfileData["plans"]) ?? [],
    interviews: (state.interviews as ProfileData["interviews"]) ?? [],
  })
}

export function useProfileSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const cached = await loadProfile()
      if (cancelled) return

      if (cached) {
        useProfileStore.getState().syncFromServer(cached)
      }

      if (!isAuthenticated) return

      try {
        const res = await fetch("/api/sync-profile")
        const json = await res.json()
        if (cancelled) return
        if (json.status !== "success" || !json.data) return

        const store = useProfileStore.getState()
        const serverData: Partial<ProfileData> = {
          plans: json.data.plans.map((p: any) => ({
            id: p.id,
            goalId: p.goal_id ?? undefined,
            nctCode: p.nct_code,
            nctTitle: p.nct_title,
            level: p.level,
            goals: typeof p.goals === "string" ? JSON.parse(p.goals) : (p.goals ?? []),
            stages: typeof p.stages === "string" ? JSON.parse(p.stages) : (p.stages ?? []),
            completedSteps: Array.isArray(p.completed_steps) ? p.completed_steps : [],
            status: p.status ?? "active",
            planType: p.plan_type ?? "general",
            roadmapId: p.roadmap_id ?? undefined,
            createdAt: new Date(p.created_at).getTime(),
          })),
          bookmarks: json.data.bookmarks.map((b: any) => ({
            id: b.id,
            nctCode: b.nct_code,
            nctTitle: b.nct_title,
            institution: b.institution,
            city: b.city,
            savedAt: new Date(b.created_at).getTime(),
          })),
          achievements: json.data.achievements.map((a: any) => ({
            id: a.achievement_id,
            title: a.title,
            description: a.description ?? "",
            unlockedAt: new Date(a.unlocked_at).getTime(),
          })),
          interviews: json.data.interviews.map((i: any) => ({
            id: i.id,
            goalId: i.goal_id ?? undefined,
            nctCode: i.nct_code,
            nctTitle: i.nct_title,
            questions: parseJSONArray(i.questions),
            summary: i.summary || undefined,
            level: i.level || undefined,
            createdAt: new Date(i.created_at).getTime(),
          })),
          activityLog: json.data.activityEvents.map(normalizeActivityEvent),
        }

        const merged = mergeProfile(
          useProfileStore.getState() as ProfileData,
          serverData as ProfileData,
        )
        store.syncFromServer(merged)
        await saveProfile(merged)
      } catch {
        // silent
      }
    }

    init()
    return () => { cancelled = true }
  }, [isAuthenticated])

  useEffect(() => {
    const unsub = useProfileStore.subscribe((state) => {
      const clean = extractProfile(state as unknown as Record<string, unknown>)
      saveProfile(clean)

      if (!isAuthenticated) return

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(async () => {
        const current = extractProfile(useProfileStore.getState() as unknown as Record<string, unknown>)
        try {
          const res = await fetch("/api/sync-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createProfileSyncPayload(current)),
          })
          if (res.ok) {
            const result = await res.json()
            if (result.status === "success" && current.deletedBookmarkCodes.length > 0) {
              useProfileStore.getState().acknowledgeBookmarkDeletes(current.deletedBookmarkCodes)
            }
          } else if (res.status !== 401 && res.status !== 403) {
            const text = await res.text()
            console.warn("[profile-sync] POST error:", res.status, text.slice(0, 200))
          }
        } catch {
          // silent — network errors are expected when offline or Supabase is unreachable
        }
      }, 2000)
    })

    return () => {
      unsub()
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [isAuthenticated])
}
