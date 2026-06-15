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

    const { nctCode, nctTitle, level, goals, stages } = parsed.data

    const { data, error } = await supabase
      .from("plans")
      .insert({
        user_id: user.id,
        nct_code: nctCode,
        nct_title: nctTitle,
        level,
        goals: JSON.stringify(goals),
        stages: JSON.stringify(stages),
      })
      .select("id")
      .single()

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
