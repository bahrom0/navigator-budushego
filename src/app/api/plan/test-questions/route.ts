import { NextResponse } from "next/server"
import { generateTestQuestions } from "@/lib/ai/generate-test-questions"
import type { DevelopmentPlan } from "@/types/plan"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nctCode, nctTitle, level, goals, stages } = body

    if (!nctCode || !stages || !Array.isArray(stages)) {
      return NextResponse.json({ status: "error", error: "Invalid plan data", questions: [] }, { status: 400 })
    }

    const plan: DevelopmentPlan = { nctCode, nctTitle, level, goals: goals || [], stages }

    const questions = await generateTestQuestions(plan)

    return NextResponse.json({ status: "success", questions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, questions: [] }, { status: 500 })
  }
}
