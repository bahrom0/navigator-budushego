import { NextResponse } from "next/server"
import { matchNCTByCluster, type MatchOptions } from "@/lib/ai/nct-match"
import { rankNCTResults, calculateOverallConfidence } from "@/lib/ai/rank-nct"
import { generateExplanations } from "@/lib/ai/generate-explanation"
import { analyzeCategories } from "@/lib/ai/analyze-categories"
import {
  AnalyzeRequestSchema,
  type AnalyzeRequest,
} from "@/types/api/analyze"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = AnalyzeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          error: parsed.error.message,
          data: null,
        },
        { status: 400 },
      )
    }

    const { categories, topK, minConfidence }: AnalyzeRequest = parsed.data

    const analysisResult = await analyzeCategories(categories)

    const matchOptions: MatchOptions = {
      topK: topK * 2,
      minScore: 0.1,
    }

    const rawMatches = matchNCTByCluster(categories, matchOptions)

    const ranked = rankNCTResults(rawMatches, {
      topK,
      minConfidence,
      diversify: true,
      maxPerCluster: 2,
    })

    const explanations = await generateExplanations(ranked, {
      userInterests: analysisResult.interests,
      userKeywords: analysisResult.keywords,
      topK,
    })

    const explanationMap = new Map<string, (typeof explanations)[number]>()
    for (const ex of explanations) {
      explanationMap.set(ex.code, ex)
    }

    const enrichedRanked = ranked.map((r) => {
      const ex = explanationMap.get(r.code)
      if (!ex) return r
      return {
        ...r,
        reasoning: ex.whyItFits,
        matchedInterests: ex.matchedInterests,
        matchedCareers: ex.matchedCareers,
      }
    })

    const overallConfidence = calculateOverallConfidence(ranked)

    return NextResponse.json({
      status: "success",
      data: {
        matches: rawMatches,
        ranked: enrichedRanked,
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
