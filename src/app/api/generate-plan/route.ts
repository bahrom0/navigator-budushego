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
      goalId: payload.goalId,
      nctCode: payload.nctCode,
      nctTitle: payload.nctTitle,
      university: payload.university,
      profession: payload.profession,
      city: payload.city,
      userInterests: payload.userInterests,
      previousAnswers: payload.previousAnswers,
      diagnosticContext: payload.diagnosticContext,
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
        let goalId = payload.goalId

        if (!goalId) {
          const { data: activeGoal } = await supabase
            .from("admission_goals")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .eq("nct_code", plan.nctCode)
            .maybeSingle()
          goalId = activeGoal?.id
        }

        if (goalId) {
          await supabase
            .from("profiles")
            .update({ active_goal_id: goalId, updated_at: new Date().toISOString() })
            .eq("user_id", user.id)
        }

        const { data: existingPlan } = await supabase
          .from("plans")
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("goal_id", goalId ?? null)
          .eq("plan_type", "general")
          .maybeSingle()

        const payloadToSave = {
          user_id: user.id,
          goal_id: goalId ?? null,
          nct_code: plan.nctCode,
          nct_title: plan.nctTitle,
          level: plan.level,
          goals: plan.goals,
          stages: plan.stages,
          completed_steps: [],
          status: "active",
          plan_type: "general",
          roadmap_id: null,
          updated_at: new Date().toISOString(),
        }

        if (existingPlan?.id) {
          await supabase
            .from("plans")
            .update(payloadToSave)
            .eq("id", existingPlan.id)
        } else {
          await supabase.from("plans").insert(payloadToSave)
        }
      }
    }

    return NextResponse.json({ status: "success", data: plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
