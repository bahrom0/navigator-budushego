"use client"

import { useEffect, useRef } from "react"
import { useProfileStore, getSessionId } from "@/stores/profile-store"
import { useAuthStore } from "@/stores/auth-store"
import { loadProfile, saveProfile } from "@/lib/chat/db"
import type { ProfileData, ActivityEvent } from "@/types/profile"
import { isPriorityActivityEventType } from "@/types/activity"

function parseJSONArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

function mergeProfile(local: ProfileData, server: ProfileData): ProfileData {
  const localIds = new Set(local.bookmarks.map((b) => b.nctCode))
  const mergedBookmarks = [
    ...local.bookmarks,
    ...server.bookmarks.filter((b) => !localIds.has(b.nctCode)),
  ]

  const planByCode = new Map<string, typeof local.plans[0]>()
  for (const p of server.plans) planByCode.set(p.nctCode, p)
  for (const p of local.plans) planByCode.set(p.nctCode, p)
  const mergedPlans = Array.from(planByCode.values())

  const achievementIds = new Set(local.achievements.map((a) => a.id))
  const mergedAchievements = [
    ...local.achievements,
    ...server.achievements.filter((a) => !achievementIds.has(a.id)),
  ]

  const interviewByCode = new Map<string, typeof local.interviews[0]>()
  for (const i of server.interviews) interviewByCode.set(i.nctCode, i)
  for (const i of local.interviews) interviewByCode.set(i.nctCode, i)
  const mergedInterviews = Array.from(interviewByCode.values())

  return {
    ...server,
    ...local,
    bookmarks: mergedBookmarks,
    plans: mergedPlans,
    achievements: mergedAchievements,
    interviews: mergedInterviews,
    sessionId: local.sessionId || server.sessionId || getSessionId(),
  }
}

function profileToPayload(state: ProfileData) {
  return {
    sessionId: state.sessionId,
    plans: state.plans.map((p) => ({
      id: p.id,
      goal_id: p.goalId,
      nct_code: p.nctCode,
      nct_title: p.nctTitle,
      level: p.level || undefined,
      goals: p.goals,
      stages: p.stages,
      completed_steps: p.completedSteps,
      status: p.status,
      plan_type: p.planType,
      roadmap_id: p.roadmapId,
      updated_at: new Date().toISOString(),
    })),
    bookmarks: state.bookmarks.map((b) => ({
      nct_code: b.nctCode,
      nct_title: b.nctTitle,
      institution: b.institution || undefined,
      city: b.city || undefined,
    })),
    achievements: state.achievements.map((a) => ({
      achievement_id: a.id,
      title: a.title,
      description: a.description || undefined,
    })),
    interviews: state.interviews.map((i) => ({
      nct_code: i.nctCode,
      nct_title: i.nctTitle,
      questions: i.questions,
      summary: i.summary || undefined,
      level: i.level || undefined,
    })),
    activityEvents: state.activityLog.map((e: ActivityEvent) => ({
      event_type: e.type,
      label: e.label,
      is_priority: typeof e.isPriority === "boolean" ? e.isPriority : isPriorityActivityEventType(e.type),
      priority_rank: typeof e.priorityRank === "number" ? e.priorityRank : (isPriorityActivityEventType(e.type) ? 1 : 0),
      metadata: { timestamp: e.timestamp },
    })),
  }
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
    id: String(event.id ?? ""),
    type: String(event.event_type ?? event.type ?? ""),
    label: String(event.label ?? ""),
    timestamp: new Date(rawTimestamp).getTime(),
    isPriority,
    priorityRank: typeof event.priority_rank === "number" ? event.priority_rank : (isPriority ? 1 : 0),
  }
}

function extractProfile(state: Record<string, unknown>): ProfileData {
  return {
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
    plans: (state.plans as ProfileData["plans"]) ?? [],
    interviews: (state.interviews as ProfileData["interviews"]) ?? [],
  }
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
            body: JSON.stringify(profileToPayload(current)),
          })
          if (!res.ok && res.status !== 401 && res.status !== 403) {
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
