import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SavePlanSchema } from "@/types/api/plan"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = SavePlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { status: "error", error: "Необходимо войти в аккаунт для сохранения плана", data: null },
        { status: 401 },
      )
    }

    const { goalId, nctCode, nctTitle, level, university, profession, city, goals, stages, planType, roadmapId } = parsed.data

    const query = supabase
      .from("plans")
      .select("id, completed_steps, status")
      .eq("user_id", user.id)
    const existingResult = goalId
      ? await query.eq("goal_id", goalId).eq("plan_type", planType ?? "general").maybeSingle()
      : await query.eq("nct_code", nctCode).maybeSingle()

    const existing = existingResult.data

    let result
    if (existing) {
      result = await supabase
        .from("plans")
        .update({
          goal_id: goalId ?? null,
          nct_code: nctCode,
          nct_title: nctTitle,
          level,
          university: university ?? null,
          profession: profession ?? null,
          city: city ?? null,
          goals,
          stages,
          plan_type: planType ?? "general",
          roadmap_id: roadmapId ?? null,
        })
        .eq("id", existing.id)
        .select("id")
        .single()
    } else {
      result = await supabase
        .from("plans")
        .insert({
          user_id: user.id,
          goal_id: goalId ?? null,
          nct_code: nctCode,
          nct_title: nctTitle,
          level,
          university: university ?? null,
          profession: profession ?? null,
          city: city ?? null,
          goals,
          stages,
          completed_steps: [],
          status: "active",
          plan_type: planType ?? "general",
          roadmap_id: roadmapId ?? null,
        })
        .select("id")
        .single()
    }

    const { data, error } = result
    if (error) {
      return NextResponse.json(
        { status: "error", error: error.message, data: null },
        { status: 500 },
      )
    }

    return NextResponse.json({ status: "success", data: { id: data.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
