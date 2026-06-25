import { NextResponse } from "next/server"
import { evaluateTestAnswers } from "@/lib/ai/evaluate-test-answers"
import type { DevelopmentPlan, PlanTestAnswer } from "@/types/plan"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nctCode, nctTitle, level, goals, stages, answers } = body

    if (!nctCode || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ status: "error", error: "Invalid data" }, { status: 400 })
    }

    const plan: DevelopmentPlan = { nctCode, nctTitle, level, goals: goals || [], stages: stages || [] }

    const typedAnswers: PlanTestAnswer[] = answers.map(
      (a: { questionId: string; question: string; answer: string }) => ({
        questionId: a.questionId,
        question: a.question,
        answer: a.answer,
      }),
    )

    const evaluation = await evaluateTestAnswers(plan, typedAnswers)

    return NextResponse.json({ status: "success", evaluation })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
