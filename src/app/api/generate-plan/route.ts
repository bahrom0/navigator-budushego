import { NextResponse } from "next/server"
import { generateDevelopmentPlan } from "@/lib/ai/generate-plan"
import { GeneratePlanSchema, type GeneratePlanRequest } from "@/types/api/plan"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = GeneratePlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const payload: GeneratePlanRequest = parsed.data

    const plan = await generateDevelopmentPlan({
      nctCode: payload.nctCode,
      nctTitle: payload.nctTitle,
      userInterests: payload.userInterests,
      assessment: payload.assessment ?? {
        level: "beginner",
        skills: [],
        strengths: [],
        gaps: [],
      },
    })

    return NextResponse.json({ status: "success", data: plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
