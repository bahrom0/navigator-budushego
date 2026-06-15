export type StrategyType = "safe" | "balanced" | "ambitious"

export type CompetitionLevel = "high" | "medium" | "low" | "risky" | "backup"

export interface CompetitionMeter {
  code: string
  level: CompetitionLevel
  score: number
  reason: string
}

export interface StrategyOption {
  type: StrategyType
  title: string
  description: string
  risk: string
  successProbability: string
  recommendedCodes: { code: string; title: string; cluster: string; institution: string }[]
  fallbackCodes: { code: string; title: string; cluster: string; institution: string }[]
}

export interface StrategyResult {
  strategies: StrategyOption[]
  userLevel: string
  userInterests: string[]
}

export interface FitScoreFactor {
  name: string
  score: number
  maxScore: number
  description: string
}

export interface FitScoreResult {
  overallScore: number
  factors: FitScoreFactor[]
  strengths: string[]
  weaknesses: string[]
  improvementPlan: string[]
  summary: string
}

export interface RouteSimulation {
  primaryCluster: { id: number; name: string } | null
  primaryCodes: { code: string; title: string; reason: string }[]
  backupCluster: { id: number; name: string } | null
  backupCodes: { code: string; title: string; reason: string }[]
  preparationTips: string[]
  reasoning: string
}
