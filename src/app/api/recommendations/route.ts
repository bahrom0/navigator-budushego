import { NextResponse } from "next/server"
import { matchNCTByCluster } from "@/lib/ai/nct-match"
import type { PrefilterOptions } from "@/lib/ai/nct-match"
import { rankNCTResults, calculateOverallConfidence } from "@/lib/ai/rank-nct"
import {
  RecommendationsRequestSchema,
  type RecommendationsRequest,
} from "@/types/api/recommendations"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RecommendationsRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { categories, topK, minConfidence, onboarding }: RecommendationsRequest =
      parsed.data

    const edLevel = onboarding?.educationLevel === "applicant"
      ? "after_11" as const
      : onboarding?.educationLevel || ""

    const prefilterOptions: PrefilterOptions | undefined = onboarding
      ? {
          categoryNames: categories.map((c) => c.name),
          educationLevel: edLevel,
          studyCity: onboarding.studyCity,
          interests: onboarding.interests,
        }
      : undefined

    const matchOptions = {
      topK: topK * 2,
      minScore: 0.1,
      prefilter: prefilterOptions,
    }

    const rawMatches = await matchNCTByCluster(categories, matchOptions)

    const ranked = rankNCTResults(rawMatches, {
      topK,
      minConfidence,
      diversify: true,
      maxPerCluster: 2,
    })

    const overallConfidence = calculateOverallConfidence(ranked)

    return NextResponse.json({
      status: "success",
      data: {
        matches: rawMatches,
        ranked,
        overallConfidence,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
