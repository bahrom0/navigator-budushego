export type SkillLevel = "beginner" | "intermediate" | "advanced"

export type PlanStatus = "active" | "testing" | "completed" | "failed"

export interface SkillAssessment {
  level: SkillLevel
  skills: string[]
  strengths: string[]
  gaps: string[]
}

export interface DevelopmentGoal {
  title: string
  description: string
}

export interface PlanStage {
  id: string
  title: string
  description: string
  skills: string[]
  recommendations: string[]
}

export interface PlanTodo {
  id: string
  label: string
  stageId: string
  completed: boolean
}

export interface PlanTestQuestion {
  id: string
  question: string
}

export interface PlanTestAnswer {
  questionId: string
  question: string
  answer: string
}

export interface PlanTestEvaluation {
  passed: boolean
  message: string
  newLevel?: SkillLevel
}

export interface DevelopmentPlan {
  nctCode: string
  nctTitle: string
  level: SkillLevel
  goals: DevelopmentGoal[]
  stages: PlanStage[]
}

export interface DevelopmentPlanWithId extends DevelopmentPlan {
  planId: string
}
