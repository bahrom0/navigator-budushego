import type { CoachDayTask, CoachGoal, CoachRoadmap } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { RecommendationSnapshot } from "@/types/recommendations"

export type AdmissionGoalStatus = "active" | "archived" | "completed"

export interface AdmissionGoalRecord extends CoachGoal {
  status: AdmissionGoalStatus
  userId?: string
  sessionId?: string
  archivedAt?: number
}

export interface DailyPlanRecord {
  id: string
  userId?: string
  sessionId?: string
  goalId: string
  roadmapId: string
  planId?: string
  planDate: string
  weekId: string
  weekNumber: number
  title: string
  tasks: CoachDayTask[]
  completedTaskIds: string[]
  skippedTaskIds?: string[]
  createdAt: number
  updatedAt: number
  previousDate?: string
  nextDate?: string
  stats?: Record<string, unknown> | null
  generationContext?: Record<string, unknown> | null
  isDraft?: boolean
}

export interface DailyTaskRecord extends CoachDayTask {
  dailyPlanId: string
  userId?: string
  sessionId?: string
  position: number
  status: "pending" | "completed"
}

export type ProductHistoryEntityType =
  | "goal"
  | "plan"
  | "roadmap"
  | "daily_plan"
  | "task"

export interface ProductHistoryRecord {
  id: string
  userId?: string
  goalId?: string
  entityType: ProductHistoryEntityType | string
  entityId?: string
  action: string
  title: string
  summary?: string
  metadata: Record<string, unknown>
  occurredAt: number
  createdAt: number
}

export interface ActiveGoalHistorySummary {
  daysTracked: number
  tasksCompleted: number
  tasksTotal: number
  lastPlanDate?: string
  productEventsTracked?: number
}

export interface ActiveGoalCommunityContext {
  goalId: string
  nctCode: string
  university?: string
  city?: string
  currentWeekNumber?: number
}

export interface ActiveGoalBundle {
  goal: CoachGoal | null
  recommendationSnapshot: RecommendationSnapshot | null
  generalPlan: DevelopmentPlan | null
  roadmap: CoachRoadmap | null
  todayPlan: DailyPlanRecord | null
  dailyHistory: DailyPlanRecord[]
  history: ProductHistoryRecord[]
  historySummary: ActiveGoalHistorySummary
  communityContext: ActiveGoalCommunityContext | null
}

/** @deprecated Use ActiveGoalBundle. */
export type PlanBundle = ActiveGoalBundle
