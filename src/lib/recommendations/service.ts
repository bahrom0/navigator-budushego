import { analyzeCategories } from "@/lib/ai/analyze-categories"
import { generateExplanations } from "@/lib/ai/generate-explanation"
import { matchNCTByCluster, type PrefilterOptions } from "@/lib/ai/nct-match"
import { calculateOverallConfidence, rankNCTResults } from "@/lib/ai/rank-nct"
import type { RecommendationResultSet } from "@/types/recommendations"

export interface BuildRecommendationsInput {
  categories: { id: string; name: string; description?: string }[]
  keywords?: string[]
  topK: number
  minConfidence: number
  onboarding?: {
    userCity?: string
    studyCity?: string
    userType?: string
    educationLevel?: "after_9" | "after_11" | "applicant" | ""
    interests?: string[]
  }
}

export async function buildRecommendations(
  input: BuildRecommendationsInput,
): Promise<RecommendationResultSet> {
  const { categories, keywords = [], topK, minConfidence, onboarding } = input
  const analysis = await analyzeCategories(categories, {
    userCity: onboarding?.userCity,
    studyCity: onboarding?.studyCity,
    userType: onboarding?.userType,
    educationLevel: onboarding?.educationLevel,
  })

  const combinedKeywords = Array.from(new Set([
    ...(onboarding?.interests ?? []),
    ...keywords,
    ...analysis.keywords,
  ]))
  const educationLevel = onboarding?.educationLevel === "applicant"
    ? "after_11" as const
    : onboarding?.educationLevel || ""
  const prefilter: PrefilterOptions | undefined = onboarding
    ? {
        categoryNames: categories.map((category) => category.name),
        educationLevel,
        studyCity: onboarding.studyCity,
        interests: combinedKeywords,
      }
    : undefined

  const matches = await matchNCTByCluster(categories, {
    topK: topK * 2,
    minScore: 0.05,
    keywords: combinedKeywords,
    prefilter,
  })
  const ranked = rankNCTResults(matches, {
    topK,
    minConfidence,
    diversify: true,
    maxPerCluster: 2,
  })
  const explanations = await generateExplanations(ranked, {
    userInterests: analysis.interests,
    userKeywords: analysis.keywords,
    topK,
    userCity: onboarding?.userCity,
    studyCity: onboarding?.studyCity,
    educationLevel: onboarding?.educationLevel,
  })
  const explanationByCode = new Map(explanations.map((item) => [item.code, item]))
  const enrichedRanked = ranked.map((item) => {
    const explanation = explanationByCode.get(item.code)
    return explanation
      ? {
          ...item,
          reasoning: explanation.whyItFits,
          matchedInterests: explanation.matchedInterests,
          matchedCareers: explanation.matchedCareers,
        }
      : item
  })
  const overallConfidence = calculateOverallConfidence(ranked)

  return {
    matches,
    ranked: enrichedRanked,
    overallConfidence,
    decisionContext: {
      categories: categories.map(({ id, name }) => ({ id, name })),
      keywords: combinedKeywords,
      onboarding: onboarding ?? null,
      overallConfidence,
      generatedAt: new Date().toISOString(),
    },
  }
}
