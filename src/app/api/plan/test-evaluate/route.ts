import { NextResponse } from "next/server"
import { evaluateTestAnswers, type TestEvaluationContext } from "@/lib/ai/evaluate-test-answers"
import type { DevelopmentPlan, PlanTestAnswer } from "@/types/plan"

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
      answers,
    } = body

    if (!nctCode || !nctTitle || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ status: "error", error: "Invalid data" }, { status: 400 })
    }

    const normalizedStages = Array.isArray(stages) ? stages : []
    const plan: DevelopmentPlan = {
      nctCode,
      nctTitle,
      level,
      goals: goals || [],
      stages: normalizedStages,
    }

    const context: TestEvaluationContext = {
      nctCode,
      nctTitle,
      level,
      university,
      profession,
      city,
      goals: goals || [],
      stages: normalizedStages,
    }

    const typedAnswers: PlanTestAnswer[] = answers.map(
      (a: { questionId: string; question: string; answer: string }) => ({
        questionId: a.questionId,
        question: a.question,
        answer: a.answer,
      }),
    )

    const evaluation = await evaluateTestAnswers(normalizedStages.length > 0 ? plan : context, typedAnswers)

    return NextResponse.json({ status: "success", evaluation, goalId: goalId || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
