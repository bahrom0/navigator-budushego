import { NextResponse } from "next/server"
import { regeneratePlan } from "@/lib/ai/regenerate-plan"
import type { DevelopmentPlan, SkillAssessment } from "@/types/plan"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nctCode, nctTitle, level, goals, stages, assessment, testMessage } = body

    if (!nctCode || !stages || !Array.isArray(stages)) {
      return NextResponse.json({ status: "error", error: "Invalid plan data" }, { status: 400 })
    }

    const previousPlan: DevelopmentPlan = { nctCode, nctTitle, level, goals: goals || [], stages }
    const userAssessment: SkillAssessment = assessment || { level: level || "beginner", skills: [], strengths: [], gaps: [] }

    const newPlan = await regeneratePlan({ previousPlan, assessment: userAssessment, testMessage: testMessage || "" })

    if (!newPlan) {
      return NextResponse.json({ status: "error", error: "Не удалось сгенерировать новый план" }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data: newPlan })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
