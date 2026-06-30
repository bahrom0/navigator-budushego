import type { UserLevel } from "@/types/profile"

export type CoachTaskType = "study" | "practice" | "review" | "test"
export type CoachGoalStatus = "active" | "achieved" | "changed"
export type CoachWeekStatus = "pending" | "active" | "completed"
export type CoachSubjectLevelName = UserLevel
export type CoachMessageRole = "user" | "coach"
export type CoachMessageType =
  | "text"
  | "task_reminder"
  | "mini_test"
  | "encouragement"
  | "progress_update"
export type CoachActiveTab = "roadmap" | "today" | "chat" | "progress"

export interface CoachGoal {
  id: string
  nctCode: string
  nctTitle: string
  university?: string
  setAt: number
  status: CoachGoalStatus
}

export interface CoachWeekTask {
  id: string
  title: string
  type: CoachTaskType
  description: string
}

export interface CoachWeek {
  id: string
  number: number
  title: string
  description: string
  subjects: string[]
  tasks: CoachWeekTask[]
  status: CoachWeekStatus
}

export interface CoachRoadmap {
  goalId: string
  weeks: CoachWeek[]
  createdAt: number
  updatedAt: number
}

export interface CoachDayTask {
  id: string
  title: string
  type: CoachTaskType
  description: string
  duration?: number
  completed: boolean
  completedAt?: number
}

export interface CoachDayPlan {
  date: string
  weekId: string
  tasks: CoachDayTask[]
  completedAt?: number
}

export interface CoachSubjectLevel {
  subject: string
  level: CoachSubjectLevelName
  score: number
}

export interface CoachDiagnosticResult {
  id: string
  goalId: string
  subjects: CoachSubjectLevel[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  takenAt: number
}

export interface CoachMiniTestQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface CoachMiniTestResult {
  totalQuestions: number
  correctAnswers: number
  subject: string
  takenAt: number
}

export interface CoachMiniTest {
  id: string
  subject: string
  questions: CoachMiniTestQuestion[]
  result?: CoachMiniTestResult
}

export interface CoachMessage {
  id: string
  role: CoachMessageRole
  content: string
  type: CoachMessageType
  miniTest?: CoachMiniTest
  timestamp: number
}

export interface CoachProgress {
  currentStreak: number
  longestStreak: number
  totalDaysActive: number
  totalTasksCompleted: number
  totalTasksPlanned: number
  roadmapCompletionPercent: number
  lastActiveDate: string
  subjectLevels: CoachSubjectLevel[]
}

export interface CoachTaskStep {
  title: string
  description: string
}

export const EMPTY_COACH_PROGRESS: CoachProgress = {
  currentStreak: 0,
  longestStreak: 0,
  totalDaysActive: 0,
  totalTasksCompleted: 0,
  totalTasksPlanned: 0,
  roadmapCompletionPercent: 0,
  lastActiveDate: "",
  subjectLevels: [],
}
