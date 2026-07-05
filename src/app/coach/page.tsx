"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCoachStore } from "@/stores/coach-store"
import { useProfileStore } from "@/stores/profile-store"
import { CoachShell } from "@/components/coach/CoachShell"
import { CoachErrorBanner } from "@/components/coach/CoachErrorBanner"
import { CoachTabContent } from "@/components/coach/CoachTabContent"
import { applyPlanBundle, getPlanId } from "@/lib/coach/bundle-client"
import {
  CoachGoalSetup,
  type CoachGoalDraft,
  type CoachRecommendation,
} from "@/components/coach/CoachGoalSetup"
import type {
  CoachGoal,
  CoachDayPlan,
  CoachDayTask,
  CoachRoadmap,
  CoachTaskStep,
  RoadmapDurationWeeks,
} from "@/types/coach"
import type { DailyPlanRecord, PlanBundle } from "@/types/admission"

export default function CoachPage() {
  const goal = useCoachStore((s) => s.goal)
  const plan = useCoachStore((s) => s.plan)
  const roadmap = useCoachStore((s) => s.roadmap)
  const dayPlan = useCoachStore((s) => s.dayPlan)
  const dailyHistory = useCoachStore((s) => s.dailyHistory)
  const setGoal = useCoachStore((s) => s.setGoal)
  const setPlan = useCoachStore((s) => s.setPlan)
  const setRoadmap = useCoachStore((s) => s.setRoadmap)
  const setDayPlan = useCoachStore((s) => s.setDayPlan)
  const setDailyHistory = useCoachStore((s) => s.setDailyHistory)
  const setLoading = useCoachStore((s) => s.setLoading)
  const error = useCoachStore((s) => s.error)
  const setError = useCoachStore((s) => s.setError)
  const activeTab = useCoachStore((s) => s.activeTab)
  const setActiveTab = useCoachStore((s) => s.setActiveTab)
  const setTaskSteps = useCoachStore((s) => s.setTaskSteps)
  const progress = useCoachStore((s) => s.progress)
  const setProgress = useCoachStore((s) => s.updateProgress)
  const diagnostics = useCoachStore((s) => s.diagnostics)
  const navigateDate = useCoachStore((s) => s.navigateDate)
  const setNavigateDate = useCoachStore((s) => s.setNavigateDate)
  const profileActiveGoal = useProfileStore((s) => s.activeGoal)
  const profileRecommendations = useProfileStore((s) => s.recommendations)
  const sessionId = useProfileStore((s) => s.sessionId)
  const setProfileActiveGoal = useProfileStore((s) => s.setActiveGoal)
  const [mounted, setMounted] = useState(false)

  const effectiveGoal = goal ?? profileActiveGoal ?? null
  const hasGoal = !!effectiveGoal

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profileActiveGoal && !goal) {
      setGoal(profileActiveGoal)
    }
  }, [profileActiveGoal, goal, setGoal])

  useEffect(() => {
    let cancelled = false

    async function loadBundle() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/plan/full", { method: "GET" })
        const payload = (await res.json()) as {
          status?: string
          data?: { activeGoalId?: string | null; bundle?: PlanBundle | null }
          error?: string
        }

        if (cancelled) return

        if (payload.status === "success" && payload.data?.bundle) {
          const bundle = payload.data.bundle
          applyPlanBundle(bundle)
          if (bundle.roadmap?.goalId) {
            setActiveTab("today")
          }
          syncProgress(bundle)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки данных")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadBundle()
    return () => {
      cancelled = true
    }
  }, [setActiveTab, setDailyHistory, setDayPlan, setError, setGoal, setLoading, setPlan, setProfileActiveGoal, setRoadmap, setProgress])

  const recommendations = useMemo<CoachRecommendation[]>(() => {
    if (!Array.isArray(profileRecommendations)) return []
    return profileRecommendations
      .map((item): CoachRecommendation | null => {
        if (!item || typeof item !== "object") return null
        const code = (item as { code?: unknown }).code
        const title = (item as { title_ru?: unknown }).title_ru
        const institution = (item as { institution?: unknown }).institution
        const city = (item as { city?: unknown }).city
        const profession = Array.isArray((item as { career_matches?: unknown }).career_matches)
          ? ((item as { career_matches?: string[] }).career_matches?.[0] ?? undefined)
          : undefined

        if (typeof code !== "string" || typeof title !== "string") return null
        return {
          nctCode: code,
          nctTitle: title,
          institution: typeof institution === "string" ? institution : undefined,
          city: typeof city === "string" ? city : undefined,
          matchScore: profession ? undefined : undefined,
        }
      })
      .filter((x): x is CoachRecommendation => x !== null)
  }, [profileRecommendations])

  const handleGenerateRoadmap = async (durationWeeks?: RoadmapDurationWeeks) => {
    if (!effectiveGoal) return
    if (!effectiveGoal.nctCode?.trim() || !effectiveGoal.nctTitle?.trim()) {
      setError("Для Coach нужна корректная цель. Обновите план или выберите цель заново.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const persistedPlanId = getPlanId(plan, effectiveGoal.planId)
      const res = await fetch("/api/coach/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: effectiveGoal.id,
          planId: persistedPlanId,
          nctCode: effectiveGoal.nctCode,
          nctTitle: effectiveGoal.nctTitle,
          university: effectiveGoal.university ?? "",
          profession: effectiveGoal.profession ?? "",
          city: effectiveGoal.city ?? "",
          durationWeeks: durationWeeks ?? 12,
          generalPlan: plan ?? null,
          diagnosticResult: diagnostics.length > 0 ? diagnostics[0] : null,
        }),
      })
      const payload = (await res.json()) as {
        status?: string
        data?: { roadmap?: unknown }
        error?: string
      }
      if (!res.ok || payload.status !== "success" || !payload.data?.roadmap) {
        throw new Error(payload.error ?? "Не удалось создать Roadmap")
      }
      const nextRoadmap = payload.data.roadmap as CoachRoadmap
      const nextGoal: CoachGoal = {
        ...effectiveGoal,
        planId: persistedPlanId,
        roadmapId: nextRoadmap.id,
      }
      setRoadmap(nextRoadmap)
      setGoal(nextGoal)
      setProfileActiveGoal(nextGoal)
      setActiveTab("today")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания Roadmap")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDailyPlan = async () => {
    if (!effectiveGoal || !roadmap) return
    if (!effectiveGoal.nctCode?.trim() || !effectiveGoal.nctTitle?.trim()) {
      setError("Для ежедневного плана нужна корректная цель. Обновите план или выберите цель заново.")
      return
    }
    if (!roadmap.id) {
      setError("Roadmap ID отсутствует. Создайте Roadmap заново.")
      return
    }
    const activeWeek = roadmap.weeks.find((w) => w.status === "active") ?? roadmap.weeks[0]
    if (!activeWeek) return
    setLoading(true)
    setError(null)
    try {
      const persistedPlanId = getPlanId(plan, effectiveGoal.planId)
      const res = await fetch("/api/coach/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: effectiveGoal.id,
          roadmapId: roadmap.id,
          planId: persistedPlanId,
          weekId: activeWeek.id,
          nctCode: effectiveGoal.nctCode,
          nctTitle: effectiveGoal.nctTitle,
          weekTitle: activeWeek.title,
          weekSubjects: activeWeek.subjects,
          weekTasks: activeWeek.tasks,
          previousCompletedCount: dayPlan?.tasks.filter((t) => t.completed).length ?? 0,
          previousSkippedCount: dayPlan ? dayPlan.tasks.length - dayPlan.tasks.filter((t) => t.completed).length : 0,
          diagnosticResult: diagnostics.length > 0 ? diagnostics[0] : null,
          planDate: navigateDate,
          generalPlan: plan ?? null,
          roadmap: roadmap ?? null,
          dailyHistory: dailyHistory ?? null,
        }),
      })
      const payload = (await res.json()) as {
        status?: string
        data?: {
          dayPlan?: {
            date: string
            weekId: string
            tasks: CoachDayTask[]
            dailyPlanId?: string
            roadmapId?: string
            goalId?: string
            weekNumber?: number
            title?: string
            completedTaskIds?: string[]
            skippedTaskIds?: string[]
            previousDate?: string
            nextDate?: string
            completedAt?: number
            stats?: Record<string, unknown> | null
          }
        }
        error?: string
      }
      if (!res.ok || payload.status !== "success" || !payload.data?.dayPlan) {
        throw new Error(payload.error ?? "Не удалось создать план на сегодня")
      }
      const dp = payload.data.dayPlan
      setDayPlan({
        date: dp.date,
        weekId: dp.weekId,
        tasks: dp.tasks,
        dailyPlanId: dp.dailyPlanId,
        roadmapId: dp.roadmapId,
        goalId: dp.goalId,
        weekNumber: dp.weekNumber,
        title: dp.title,
        completedTaskIds: dp.completedTaskIds,
        skippedTaskIds: dp.skippedTaskIds,
        previousDate: dp.previousDate,
        nextDate: dp.nextDate,
        completedAt: dp.completedAt,
        stats: dp.stats,
      })
      setDailyHistory([
        {
          id: dp.dailyPlanId ?? `${dp.date}-${dp.weekId}`,
          goalId: dp.goalId ?? effectiveGoal.id,
          roadmapId: dp.roadmapId ?? roadmap.id,
          planId: persistedPlanId,
          planDate: dp.date,
          weekId: dp.weekId,
          weekNumber: dp.weekNumber ?? activeWeek.number,
          title: dp.title ?? activeWeek.title,
          tasks: dp.tasks,
          completedTaskIds: dp.completedTaskIds ?? [],
          skippedTaskIds: dp.skippedTaskIds,
          createdAt: dp.completedAt ?? Date.now(),
          updatedAt: dp.completedAt ?? Date.now(),
          previousDate: dp.previousDate,
          nextDate: dp.nextDate,
          stats: dp.stats ?? null,
        },
        ...dailyHistory.filter((item) => item.planDate !== dp.date),
      ].sort((a, b) => b.planDate.localeCompare(a.planDate)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания плана")
    } finally {
      setLoading(false)
    }
  }

  const handleTaskDetail = async (taskId: string) => {
    if (!effectiveGoal || !roadmap || !dayPlan) return
    const task = dayPlan.tasks.find((t) => t.id === taskId)
    if (!task) return
    const activeWeek = roadmap.weeks.find((w) => w.id === dayPlan.weekId) ?? roadmap.weeks[0]
    if (!activeWeek) return
    try {
      const res = await fetch("/api/coach/task-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskType: task.type,
          taskDescription: task.description,
          nctTitle: effectiveGoal.nctTitle,
          weekTitle: activeWeek.title,
        }),
      })
      const payload = (await res.json()) as {
        status?: string
        data?: { steps?: CoachTaskStep[] }
        error?: string
      }
      if (!res.ok || payload.status !== "success" || !payload.data?.steps) {
        throw new Error(payload.error ?? "Не удалось загрузить план")
      }
      setTaskSteps(taskId, payload.data.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки плана")
    }
  }

  const handleNavigateDate = useCallback(
    async (date: string) => {
      if (!effectiveGoal) return
      setNavigateDate(date)
      setLoading(true)
      try {
        const res = await fetch(`/api/coach/daily-plan?planDate=${date}&goalId=${effectiveGoal.id}`, {
          method: "GET",
        })
        const payload = (await res.json()) as {
          status?: string
          data?: { dayPlan?: CoachDayPlan | null }
          error?: string
        }
        if (res.ok && payload.status === "success") {
          if (payload.data?.dayPlan) {
            setDayPlan(payload.data.dayPlan)
          } else {
            setDayPlan(null)
          }
        }
      } catch (err) {
        console.error("[coach] navigate date error:", err)
      } finally {
        setLoading(false)
      }
    },
    [effectiveGoal, setNavigateDate, setDayPlan, setLoading],
  )

  if (!mounted) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </main>
    )
  }

  if (!hasGoal) return <GoalSetupFlow recommendations={recommendations} sessionId={sessionId} />

  return (
    <CoachShell>
      {error ? <CoachErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      <CoachTabContent
        tab={activeTab}
        onGenerateRoadmap={handleGenerateRoadmap}
        onGenerateDailyPlan={handleGenerateDailyPlan}
        onRequestTaskDetail={handleTaskDetail}
        onNavigateDate={handleNavigateDate}
      />
    </CoachShell>
  )
}

function GoalSetupFlow({
  recommendations,
  sessionId,
}: {
  recommendations: CoachRecommendation[]
  sessionId: string
}) {
  const setGoal = useCoachStore((s) => s.setGoal)
  const setPlan = useCoachStore((s) => s.setPlan)
  const setRoadmap = useCoachStore((s) => s.setRoadmap)
  const setDayPlan = useCoachStore((s) => s.setDayPlan)
  const setDailyHistory = useCoachStore((s) => s.setDailyHistory)
  const setError = useCoachStore((s) => s.setError)
  const setLoading = useCoachStore((s) => s.setLoading)
  const setProfileGoal = useProfileStore((s) => s.setActiveGoal)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (draft: CoachGoalDraft) => {
    setSubmitting(true)
    setLocalError(null)
    try {
      const selected = recommendations.find((item) => item.nctCode === draft.nctCode)
      const res = await fetch("/api/goals/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          nctCode: draft.nctCode,
          nctTitle: draft.nctTitle,
          university: draft.university ?? selected?.institution ?? "",
          profession: selected?.nctTitle ?? draft.nctTitle,
          city: selected?.city ?? "",
          careerMatches: selected ? [selected.nctTitle] : [],
          matchedInterests: [],
        }),
      })
      const payload = (await res.json()) as {
        status?: string
        data?: { goal?: CoachGoal; persisted?: boolean }
        error?: string
      }
      if (!res.ok || payload.status !== "success" || !payload.data?.goal) {
        const message = payload.error ?? "Не удалось сохранить цель"
        setLocalError(message)
        setError(message)
        return
      }
      setGoal(payload.data.goal)
      setProfileGoal(payload.data.goal)
      setPlan(null)
      setRoadmap(null)
      setDayPlan(null)
      setDailyHistory([])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Сетевая ошибка"
      setLocalError(message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <CoachGoalSetup
        recommendations={recommendations}
        submitting={submitting}
        errorMessage={localError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}

function syncProgress(bundle: PlanBundle) {
  const roadmapWeeks = bundle.roadmap?.weeks ?? []
  const totalTasksPlanned = roadmapWeeks.reduce((sum, week) => sum + week.tasks.length, 0)
  const completedTasks = bundle.history.reduce(
    (sum, plan) => sum + plan.tasks.filter((task) => task.completed).length,
    0,
  )
  const completionPercent = totalTasksPlanned > 0 ? Math.round((completedTasks / totalTasksPlanned) * 100) : 0
  useCoachStore.getState().updateProgress({
    totalTasksPlanned,
    totalTasksCompleted: completedTasks,
    roadmapCompletionPercent: completionPercent,
  })
}
