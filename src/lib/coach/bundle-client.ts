"use client"

import { useCoachStore } from "@/stores/coach-store"
import { useProfileStore } from "@/stores/profile-store"
import type { ActiveGoalBundle, DailyPlanRecord } from "@/types/admission"
import type { CoachDayPlan, CoachGoal } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"

export type PersistedDevelopmentPlan = DevelopmentPlan & {
  id?: string
  goal_id?: string | null
  roadmap_id?: string | null
}

export function buildFallbackGoal(
  nctCode: string,
  nctTitle: string,
  overrides: Partial<CoachGoal> = {},
): CoachGoal {
  return {
    id: overrides.id ?? `local-${nctCode}`,
    nctCode,
    nctTitle,
    university: overrides.university,
    profession: overrides.profession,
    city: overrides.city,
    setAt: overrides.setAt ?? Date.now(),
    status: overrides.status ?? "active",
    planId: overrides.planId,
    roadmapId: overrides.roadmapId,
  }
}

export function toPersistedPlan(plan: ActiveGoalBundle["generalPlan"] | null | undefined): PersistedDevelopmentPlan | null {
  if (!plan) return null
  return plan as PersistedDevelopmentPlan
}

export function goalFromBundle(bundle: ActiveGoalBundle): CoachGoal | null {
  if (bundle.goal) {
    return {
      ...bundle.goal,
      planId: toPersistedPlan(bundle.generalPlan)?.id,
      roadmapId: bundle.roadmap?.id,
    }
  }

  const persistedPlan = toPersistedPlan(bundle.generalPlan)
  if (!persistedPlan) return null

  return buildFallbackGoal(persistedPlan.nctCode, persistedPlan.nctTitle, {
    id: typeof persistedPlan.goal_id === "string" ? persistedPlan.goal_id : `local-${persistedPlan.nctCode}`,
    planId: persistedPlan.id,
    roadmapId: bundle.roadmap?.id,
  })
}

export function toCoachDayPlan(record: DailyPlanRecord | null | undefined): CoachDayPlan | null {
  if (!record) return null

  return {
    date: record.planDate,
    weekId: record.weekId,
    tasks: record.tasks,
    dailyPlanId: record.id,
    roadmapId: record.roadmapId,
    goalId: record.goalId,
    weekNumber: record.weekNumber,
    title: record.title,
    completedTaskIds: record.completedTaskIds,
    skippedTaskIds: record.skippedTaskIds,
    previousDate: record.previousDate,
    nextDate: record.nextDate,
    completedAt: record.updatedAt,
    stats: record.stats,
    generationContext: record.generationContext,
    isDraft: record.isDraft,
  }
}

export function applyActiveGoalBundle(bundle: ActiveGoalBundle): void {
  const coach = useCoachStore.getState()
  const profile = useProfileStore.getState()
  const goal = goalFromBundle(bundle)
  const plan = toPersistedPlan(bundle.generalPlan)

  if (goal) {
    profile.setActiveGoal(goal)
  } else {
    profile.clearActiveGoal()
  }

  coach.applyBundle({
    ...bundle,
    goal: goal ?? bundle.goal,
    generalPlan: plan,
  })
}

export function getPlanId(plan: DevelopmentPlan | null | undefined, fallback?: string): string | undefined {
  if (fallback) return fallback
  if (!plan) return undefined

  const candidate = (plan as PersistedDevelopmentPlan).id
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined
}
