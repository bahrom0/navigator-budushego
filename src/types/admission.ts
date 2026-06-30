import type { CoachDayTask, CoachGoal, CoachRoadmap } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"

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
}

export interface DailyTaskRecord extends CoachDayTask {
  dailyPlanId: string
  userId?: string
  sessionId?: string
  position: number
  status: "pending" | "completed"
}

export interface PlanBundle {
  goal: AdmissionGoalRecord | null
  plan: DevelopmentPlan | null
  roadmap: CoachRoadmap | null
  today: DailyPlanRecord | null
  history: DailyPlanRecord[]
}
