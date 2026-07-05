import type {
  CanonicalRecommendation,
  RecommendationDecisionContext,
  RecommendationSnapshot,
} from "@/types/recommendations"

export function createRecommendationSnapshot(
  recommendation: CanonicalRecommendation,
  context: RecommendationDecisionContext,
  filters: RecommendationSnapshot["filters"] = {},
  relatedCodes: string[] = [],
): RecommendationSnapshot {
  return {
    version: 1,
    selectedAt: new Date().toISOString(),
    inputs: {
      categories: context.categories,
      keywords: context.keywords,
      onboarding: context.onboarding,
    },
    selection: {
      code: recommendation.code,
      title: recommendation.title_ru,
      rank: recommendation.rank,
      confidence: recommendation.confidence,
      finalScore: recommendation.finalScore,
      explanation: recommendation.reasoning,
      matchedInterests: recommendation.matchedInterests ?? [],
      matchedCareers: recommendation.matchedCareers ?? recommendation.career_matches,
      relatedCodes,
    },
    filters,
    overallConfidence: context.overallConfidence,
  }
}
