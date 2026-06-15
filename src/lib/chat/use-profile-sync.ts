"use client"

import { useEffect, useRef } from "react"
import { useProfileStore, getSessionId } from "@/stores/profile-store"
import { useAuthStore } from "@/stores/auth-store"
import { loadProfile, saveProfile } from "@/lib/chat/db"
import type { ProfileData, ActivityEvent } from "@/types/profile"

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
      nct_code: p.nctCode,
      nct_title: p.nctTitle,
      level: p.level || undefined,
      goals: p.goals,
      stages: p.stages,
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
      metadata: { timestamp: e.timestamp },
    })),
  }
}

function extractProfile(state: Record<string, unknown>): ProfileData {
  return {
    sessionId: (state.sessionId as string) ?? "",
    level: (state.level as ProfileData["level"]) ?? "beginner",
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
            nctCode: p.nct_code,
            nctTitle: p.nct_title,
            level: p.level,
            goals: typeof p.goals === "string" ? JSON.parse(p.goals) : (p.goals ?? []),
            stages: typeof p.stages === "string" ? JSON.parse(p.stages) : (p.stages ?? []),
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
          activityLog: json.data.activityEvents.map((e: any) => ({
            id: e.id,
            type: e.event_type,
            label: e.label ?? "",
            timestamp: new Date(e.created_at).getTime(),
          })),
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
          if (!res.ok) {
            const text = await res.text()
            console.error("[profile-sync] POST error:", res.status, text)
          }
        } catch (err) {
          console.error("[profile-sync] POST failed:", err)
        }
      }, 2000)
    })

    return () => {
      unsub()
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [isAuthenticated])
}
