"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useCoachStore } from "@/stores/coach-store"
import { useProfileStore } from "@/stores/profile-store"
import { CoachShell } from "@/components/coach/CoachShell"
import { CoachErrorBanner } from "@/components/coach/CoachErrorBanner"
import { CoachTabContent } from "@/components/coach/CoachTabContent"
import { applyActiveGoalBundle, getPlanId, toCoachDayPlan } from "@/lib/coach/bundle-client"
import { RoadmapDurationModal } from "@/components/coach/RoadmapDurationModal"
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
import type { ActiveGoalBundle } from "@/types/admission"
import { getRoadmapStartDate, getWeekForDate } from "@/lib/coach/daily-plan-schedule"

function CoachPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const goal = useCoachStore((s) => s.goal)
  const plan = useCoachStore((s) => s.plan)
  const setPlan = useCoachStore((s) => s.setPlan)
  const roadmap = useCoachStore((s) => s.roadmap)
  const dayPlan = useCoachStore((s) => s.dayPlan)
  const dailyHistory = useCoachStore((s) => s.dailyHistory)
  const setGoal = useCoachStore((s) => s.setGoal)
  const setRoadmap = useCoachStore((s) => s.setRoadmap)
  const setDayPlan = useCoachStore((s) => s.setDayPlan)
  const setDailyHistory = useCoachStore((s) => s.setDailyHistory)
  const setLoading = useCoachStore((s) => s.setLoading)
  const error = useCoachStore((s) => s.error)
  const setError = useCoachStore((s) => s.setError)
  const activeTab = useCoachStore((s) => s.activeTab)
  const setActiveTab = useCoachStore((s) => s.setActiveTab)
  const setTaskSteps = useCoachStore((s) => s.setTaskSteps)
  const diagnostics = useCoachStore((s) => s.diagnostics)
  const navigateDate = useCoachStore((s) => s.navigateDate)
  const setNavigateDate = useCoachStore((s) => s.setNavigateDate)
  const profileActiveGoal = useProfileStore((s) => s.activeGoal)
  const profilePlans = useProfileStore((s) => s.plans)
  const profileRecommendations = useProfileStore((s) => s.recommendations)
  const sessionId = useProfileStore((s) => s.sessionId)
  const setProfileActiveGoal = useProfileStore((s) => s.setActiveGoal)
  const [mounted, setMounted] = useState(false)
  const [showRoadmapSetup, setShowRoadmapSetup] = useState(false)
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false)

  const effectiveGoal = goal ?? profileActiveGoal ?? null
  const hasGoal = !!effectiveGoal

  const syncBundle = useCallback((bundle: ActiveGoalBundle) => {
    const selectedDate = useCoachStore.getState().navigateDate
    const selectedPlan = bundle.dailyHistory.find((plan) => plan.planDate === selectedDate) ?? null
    const preferredPlan = selectedPlan ?? bundle.todayPlan

    applyActiveGoalBundle(bundle)

    const todayCandidate = preferredPlan
    if (todayCandidate?.planDate) {
      setNavigateDate(todayCandidate.planDate)
    } else {
      const roadmapStartDate = getRoadmapStartDate(bundle.roadmap)
      if (roadmapStartDate) {
        setNavigateDate(roadmapStartDate)
      }
    }

    if (bundle.roadmap) {
      setActiveTab(todayCandidate && !todayCandidate.isDraft ? "today" : "roadmap")
      if (todayCandidate) {
        setDayPlan({
          date: todayCandidate.planDate,
          weekId: todayCandidate.weekId,
          tasks: todayCandidate.tasks,
          dailyPlanId: todayCandidate.id,
          roadmapId: todayCandidate.roadmapId,
          goalId: todayCandidate.goalId,
          weekNumber: todayCandidate.weekNumber,
          title: todayCandidate.title,
          completedTaskIds: todayCandidate.completedTaskIds,
          skippedTaskIds: todayCandidate.skippedTaskIds,
          previousDate: todayCandidate.previousDate,
          nextDate: todayCandidate.nextDate,
          completedAt: todayCandidate.updatedAt,
          stats: todayCandidate.stats,
          generationContext: todayCandidate.generationContext,
          isDraft: todayCandidate.isDraft,
        })
      }
    }

    syncProgress(bundle)
  }, [setActiveTab, setDayPlan, setNavigateDate])

  const loadBundle = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/plan/full", { method: "GET" })
      const payload = (await res.json()) as {
        status?: string
        data?: { activeGoalId?: string | null; bundle?: ActiveGoalBundle | null }
        error?: string
      }

      if (payload.status === "success" && payload.data?.bundle) {
        syncBundle(payload.data.bundle)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С…")
    } finally {
      setLoading(false)
    }
  }, [setError, setLoading, syncBundle])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profileActiveGoal && !goal) {
      setGoal(profileActiveGoal)
    }
  }, [profileActiveGoal, goal, setGoal])

  useEffect(() => {
    if (plan || !effectiveGoal) return
    const localPlan = profilePlans.find((item) => item.goalId === effectiveGoal.id || item.nctCode === effectiveGoal.nctCode)
    if (!localPlan) return

    setPlan({
      nctCode: localPlan.nctCode,
      nctTitle: localPlan.nctTitle,
      level: localPlan.level,
      goals: localPlan.goals,
      stages: localPlan.stages,
    })
  }, [effectiveGoal, plan, profilePlans, setPlan])

  useEffect(() => {
    void loadBundle()
  }, [loadBundle])

  useEffect(() => {
    if (!mounted) return
    if (!effectiveGoal || roadmap) return
    if (searchParams.get("setup") !== "roadmap") return
    setActiveTab("roadmap")
    setShowRoadmapSetup(true)
  }, [mounted, effectiveGoal, roadmap, searchParams, setActiveTab])

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
      setError("Р”Р»СЏ Coach РЅСѓР¶РЅР° РєРѕСЂСЂРµРєС‚РЅР°СЏ С†РµР»СЊ. РћР±РЅРѕРІРёС‚Рµ РїР»Р°РЅ РёР»Рё РІС‹Р±РµСЂРёС‚Рµ С†РµР»СЊ Р·Р°РЅРѕРІРѕ.")
      return
    }
    setLoading(true)
    setError(null)
    setIsGeneratingRoadmap(true)
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
        throw new Error(payload.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ Roadmap")
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
      setNavigateDate(getRoadmapStartDate(nextRoadmap) ?? new Date().toISOString().slice(0, 10))

      await loadBundle()
      setActiveTab("roadmap")
      setShowRoadmapSetup(false)
      router.replace("/coach")
    } catch (err) {
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ Roadmap")
    } finally {
      setIsGeneratingRoadmap(false)
      setLoading(false)
    }
  }

  const handleGenerateDailyPlan = async (targetDate?: string) => {
    if (!effectiveGoal || !roadmap) return
    if (!effectiveGoal.nctCode?.trim() || !effectiveGoal.nctTitle?.trim()) {
      setError("Р”Р»СЏ РµР¶РµРґРЅРµРІРЅРѕРіРѕ РїР»Р°РЅР° РЅСѓР¶РЅР° РєРѕСЂСЂРµРєС‚РЅР°СЏ С†РµР»СЊ. РћР±РЅРѕРІРёС‚Рµ РїР»Р°РЅ РёР»Рё РІС‹Р±РµСЂРёС‚Рµ С†РµР»СЊ Р·Р°РЅРѕРІРѕ.")
      return
    }
    if (!roadmap.id) {
      setError("Roadmap ID РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚. РЎРѕР·РґР°Р№С‚Рµ Roadmap Р·Р°РЅРѕРІРѕ.")
      return
    }

    const targetPlanDate = targetDate ?? navigateDate
    const matchedWeek = getWeekForDate(roadmap, targetPlanDate)
    const fallbackWeek = roadmap.weeks.find((w) => w.status === "active") ?? roadmap.weeks[0]
    const activeWeek = matchedWeek ?? fallbackWeek
    if (!activeWeek) return

    setLoading(true)
    setError(null)
    setNavigateDate(targetPlanDate)
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
          planDate: targetPlanDate,
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
            generationContext?: Record<string, unknown> | null
            isDraft?: boolean
          }
        }
        error?: string
      }
      if (!res.ok || payload.status !== "success" || !payload.data?.dayPlan) {
        throw new Error(payload.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїР»Р°РЅ РЅР° РґРµРЅСЊ")
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
        generationContext: dp.generationContext,
        isDraft: dp.isDraft,
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
          generationContext: dp.generationContext ?? null,
          isDraft: dp.isDraft ?? false,
        },
        ...dailyHistory.filter((item) => item.planDate !== dp.date),
      ].sort((a, b) => b.planDate.localeCompare(a.planDate)))
      setNavigateDate(dp.date)
      setActiveTab("today")
    } catch (err) {
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°РЅР°")
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
        throw new Error(payload.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїР»Р°РЅ")
      }
      setTaskSteps(taskId, payload.data.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїР»Р°РЅР°")
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
          setDayPlan(payload.data?.dayPlan ?? null)
          setLoading(false)
          return
        }
      } catch (err) {
        console.error("[coach] navigate date error:", err)
      }

      const localPlan = dailyHistory.find((plan) => plan.planDate === date) ?? null
      setDayPlan(localPlan ? toCoachDayPlan(localPlan) : null)
      setLoading(false)
    },
    [dailyHistory, effectiveGoal, setNavigateDate, setDayPlan, setLoading],
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
    <>
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

      <RoadmapDurationModal
        open={showRoadmapSetup}
        onClose={() => {
          setShowRoadmapSetup(false)
          if (searchParams.get("setup") === "roadmap") {
            router.replace("/coach")
          }
        }}
        onConfirm={(duration) => {
          void handleGenerateRoadmap(duration)
        }}
        loading={isGeneratingRoadmap}
      />

      {isGeneratingRoadmap ? <RoadmapGeneratingOverlay /> : null}
    </>
  )
}

function CoachPageSkeleton() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </main>
  )
}

export default function CoachPage() {
  return (
    <Suspense fallback={<CoachPageSkeleton />}>
      <CoachPageContent />
    </Suspense>
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
        const message = payload.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ С†РµР»СЊ"
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
      const message = err instanceof Error ? err.message : "РЎРµС‚РµРІР°СЏ РѕС€РёР±РєР°"
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

function syncProgress(bundle: ActiveGoalBundle) {
  const roadmapWeeks = bundle.roadmap?.weeks ?? []
  const totalTasksPlanned = roadmapWeeks.reduce((sum, week) => sum + week.tasks.length, 0)
  const completedTasks = bundle.dailyHistory.reduce(
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

function RoadmapGeneratingOverlay() {
  const steps = [
    "Определяем горизонт подготовки",
    "Собираем roadmap по неделям",
    "Подготавливаем future daily plans в базе",
  ]

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-card-bg p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">Создаём ваш Coach roadmap</p>
            <p className="mt-1 text-sm text-text-secondary">
              Сейчас сохраняем маршрут и сразу раскладываем будущие дни, чтобы Today мог работать наперёд без швов.
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>

        <div className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-[14px] border border-border bg-background px-4 py-3">
              <div
                className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary"
                style={{ animationDelay: `${index * 120}ms` }}
              />
              <span className="text-sm text-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
