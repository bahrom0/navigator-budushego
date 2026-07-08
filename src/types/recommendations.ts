import type { NCTMatchResult, RankedNCT } from "@/types/nct"
import type { AnalysisStep } from "@/types/analysis"

export interface RecommendationOnboardingContext {
  userCity?: string
  studyCity?: string
  userType?: string
  educationLevel?: "after_9" | "after_11" | "applicant" | ""
  interests?: string[]
}

export interface RecommendationDecisionContext {
  categories: { id: string; name: string }[]
  keywords: string[]
  onboarding: RecommendationOnboardingContext | null
  overallConfidence: number
  generatedAt: string
  pipeline: {
    completedSteps: AnalysisStep[]
    usedFallbacks: string[]
    professions: string[]
    directions: string[]
    searchIntents: string[]
  }
}

export interface CanonicalRecommendation extends RankedNCT {
  matchedInterests?: string[]
  matchedCareers?: string[]
}

export interface RecommendationResultSet {
  matches: NCTMatchResult[]
  ranked: CanonicalRecommendation[]
  overallConfidence: number
  decisionContext: RecommendationDecisionContext
}

export interface RecommendationSnapshot {
  version: 1
  selectedAt: string
  inputs: {
    categories: { id: string; name: string }[]
    keywords: string[]
    onboarding: RecommendationOnboardingContext | null
  }
  selection: {
    code: string
    title: string
    rank: number
    confidence: number
    finalScore: number
    explanation: string
    matchedInterests: string[]
    matchedCareers: string[]
    relatedCodes: string[]
  }
  filters: {
    city?: string
    studyForm?: string
    sortBy?: "confidence" | "institution"
    sortDir?: "asc" | "desc"
  }
  overallConfidence: number
}

export interface RecommendationCacheData extends RecommendationResultSet {
  categories: { id: string; name: string; description?: string }[]
}
