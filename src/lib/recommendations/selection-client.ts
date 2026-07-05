"use client"

import { createRecommendationSnapshot } from "@/lib/recommendations/snapshot"
import type { CoachGoal } from "@/types/coach"
import type {
  CanonicalRecommendation,
  RecommendationResultSet,
  RecommendationSnapshot,
} from "@/types/recommendations"

interface SelectRecommendationGoalInput {
  recommendation: CanonicalRecommendation
  resultSet: RecommendationResultSet
  sessionId: string
  filters?: RecommendationSnapshot["filters"]
}

export async function selectRecommendationGoal({
  recommendation,
  resultSet,
  sessionId,
  filters = {},
}: SelectRecommendationGoalInput): Promise<CoachGoal> {
  const relatedCodes = resultSet.ranked
    .filter((item) => item.code !== recommendation.code && (
      item.branchKey === recommendation.branchKey || item.cluster === recommendation.cluster
    ))
    .slice(0, 3)
    .map((item) => item.code)
  const recommendationSnapshot = createRecommendationSnapshot(
    recommendation,
    resultSet.decisionContext,
    filters,
    relatedCodes,
  )
  const response = await fetch("/api/goals/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      nctCode: recommendation.code,
      nctTitle: recommendation.title_ru,
      university: recommendation.institution ?? "",
      profession: recommendation.matchedCareers?.[0] ?? recommendation.career_matches[0] ?? "",
      city: recommendation.city ?? "",
      careerMatches: recommendation.matchedCareers ?? recommendation.career_matches,
      matchedInterests: recommendation.matchedInterests ?? [],
      recommendationSnapshot,
    }),
  })
  const payload = await response.json()

  if (!response.ok || payload.status !== "success" || !payload.data?.goal) {
    throw new Error(payload.error ?? "Не удалось выбрать цель")
  }

  return payload.data.goal as CoachGoal
}
