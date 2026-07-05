import type { CoachGoal } from "@/types/coach"

export type UserLevel = "beginner" | "intermediate" | "advanced"

export interface SkillAssessment {
  level: UserLevel
  skills: string[]
  strengths: string[]
  gaps: string[]
  summary?: string
}

export interface PlanStep {
  id: string
  title: string
  description: string
  completed: boolean
}

export interface PlanRecord {
  id: string
  goalId?: string
  nctCode: string
  nctTitle: string
  level: UserLevel
  goals: { title: string; description: string }[]
  stages: { id: string; title: string; description: string; skills: string[]; recommendations: string[] }[]
  createdAt: number
  status: string
  completedSteps: string[]
  planType?: "general" | "roadmap" | "daily"
  roadmapId?: string
}

export interface InterviewRecord {
  id: string
  goalId?: string
  nctCode: string
  nctTitle: string
  questions: { id: string; question: string; answer: string }[]
  summary?: string
  level?: UserLevel
  createdAt: number
}

export interface ActivityEvent {
  id: string
  type: string
  label: string
  timestamp: number
  isPriority?: boolean
  priorityRank?: number
}

export interface BookmarkRecord {
  id: string
  nctCode: string
  nctTitle: string
  institution?: string
  city?: string
  savedAt: number
}

export interface AchievementRecord {
  id: string
  title: string
  description: string
  unlockedAt?: number
}

export interface ProfileData {
  sessionId: string
  level: UserLevel
  activeGoalId?: string
  activeGoal?: CoachGoal | null
  goalHistory: CoachGoal[]
  lastNctCodes: string[]
  recommendations: any[]
  savedCodes: string[]
  activityLog: ActivityEvent[]
  achievements: AchievementRecord[]
  activePlanId?: string
  interviewResult?: { summary?: string; level?: UserLevel }
  bookmarks: BookmarkRecord[]
  deletedBookmarkCodes: string[]
  plans: PlanRecord[]
  interviews: InterviewRecord[]
}
