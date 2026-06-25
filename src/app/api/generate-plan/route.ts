import { NextResponse } from "next/server"
import { generateDevelopmentPlan } from "@/lib/ai/generate-plan"
import { createClient } from "@/lib/supabase/server"
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

    if (!plan) {
      return NextResponse.json(
        { status: "error", error: "Не удалось сгенерировать план", data: null },
        { status: 500 },
      )
    }

    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("plans").insert({
          user_id: user.id,
          nct_code: plan.nctCode,
          nct_title: plan.nctTitle,
          level: plan.level,
          goals: plan.goals,
          stages: plan.stages,
          completed_steps: [],
          status: "active",
        })
      }
    }

    return NextResponse.json({ status: "success", data: plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
