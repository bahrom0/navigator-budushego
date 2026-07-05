import { NextResponse } from "next/server"
import { generateDevelopmentPlan } from "@/lib/ai/generate-plan"
import { createClient } from "@/lib/supabase/server"
import { resolveCoachContext } from "@/lib/coach/persistence"
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
    let persistedPlanId: string | null = null
    let persistedGoalId: string | null = payload.goalId ?? null

    if (session) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const context = await resolveCoachContext(supabase, user.id, {
          goalId: payload.goalId,
          nctCode: plan.nctCode,
          nctTitle: plan.nctTitle,
          university: payload.university ?? null,
          profession: payload.profession ?? null,
          city: payload.city ?? null,
        })
        const goalId = context.goal?.id ?? null
        persistedGoalId = goalId

        if (!goalId) {
          throw new Error("Не удалось закрепить план за активной целью")
        }

        const existingPlan = context.plan

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
          const { data: updatedPlan, error: updateError } = await supabase
            .from("plans")
            .update(payloadToSave)
            .eq("id", existingPlan.id)
            .select("id")
            .single()
          if (updateError) throw updateError
          persistedPlanId = updatedPlan?.id ?? existingPlan.id
        } else {
          const { data: insertedPlan, error: insertError } = await supabase
            .from("plans")
            .insert(payloadToSave)
            .select("id")
            .single()
          if (insertError) throw insertError
          persistedPlanId = insertedPlan?.id ?? null
        }
      }
    }

    return NextResponse.json({
      status: "success",
      data: {
        ...plan,
        id: persistedPlanId,
        goal_id: persistedGoalId,
        roadmap_id: null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
