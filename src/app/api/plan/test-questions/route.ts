import { NextResponse } from "next/server"
import { generateTestQuestions, type TestQuestionContext } from "@/lib/ai/generate-test-questions"
import type { DevelopmentPlan } from "@/types/plan"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      goalId,
      nctCode,
      nctTitle,
      level,
      goals,
      stages,
      university,
      profession,
      city,
      userInterests,
    } = body

    if (!nctCode || !nctTitle) {
      return NextResponse.json(
        { status: "error", error: "Invalid goal data", questions: [] },
        { status: 400 },
      )
    }

    const normalizedStages = Array.isArray(stages) ? stages : []
    const plan: DevelopmentPlan = {
      nctCode,
      nctTitle,
      level,
      goals: goals || [],
      stages: normalizedStages,
    }

    const goalContext: TestQuestionContext = {
      nctCode,
      nctTitle,
      level,
      university,
      profession,
      city,
      userInterests: Array.isArray(userInterests) ? userInterests : [],
      goals: goals || [],
      stages: normalizedStages,
    }

    const questions = await generateTestQuestions(normalizedStages.length > 0 ? plan : goalContext)

    return NextResponse.json({
      status: "success",
      questions,
      goalId: goalId || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, questions: [] }, { status: 500 })
  }
}
