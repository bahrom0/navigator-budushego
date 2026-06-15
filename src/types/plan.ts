export type SkillLevel = "beginner" | "intermediate" | "advanced"

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

export interface DevelopmentPlan {
  nctCode: string
  nctTitle: string
  level: SkillLevel
  goals: DevelopmentGoal[]
  stages: PlanStage[]
}
