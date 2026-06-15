import { NextResponse } from "next/server"
import { z } from "zod"
import { calculateFitScore } from "@/features/strategy/fit-score"
import { generateFitScoreAI } from "@/lib/ai/generate-fit-score"

export const dynamic = "force-dynamic"

const FitScoreRequestSchema = z.object({
  nctCode: z.string().min(1),
  nctTitle: z.string().min(1),
  categories: z.array(z.string()).min(1),
  interviewSummary: z.string().optional(),
  userLevel: z.string().optional(),
  matchedKeywords: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  useAI: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = FitScoreRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { nctCode, nctTitle, categories, interviewSummary, userLevel, matchedKeywords, confidence, useAI } = parsed.data

    let result

    if (useAI) {
      const aiResult = await generateFitScoreAI({
        nctCode,
        nctTitle,
        userCategories: categories,
        interviewSummary,
        userLevel,
        matchedKeywords,
      })

      if (aiResult && aiResult.overallScore >= 0) {
        result = aiResult
      } else {
        result = calculateFitScore({
          categories,
          nctCode,
          nctTitle,
          interviewResult: interviewSummary ? { summary: interviewSummary, level: userLevel } : undefined,
          matchedKeywords,
          confidence,
        })
      }
    } else {
      result = calculateFitScore({
        categories,
        nctCode,
        nctTitle,
        interviewResult: interviewSummary ? { summary: interviewSummary, level: userLevel } : undefined,
        matchedKeywords,
        confidence,
      })
    }

    return NextResponse.json({ status: "success", data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
