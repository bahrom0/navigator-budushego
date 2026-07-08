import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ status: "success", data: { cleared: false, persisted: false } })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ status: "success", data: { cleared: false, persisted: false } })
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        active_goal_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (profileError) {
      return NextResponse.json({ status: "error", error: profileError.message, data: null }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from("admission_goals")
      .delete()
      .eq("user_id", user.id)

    if (deleteError) {
      return NextResponse.json({ status: "error", error: deleteError.message, data: null }, { status: 500 })
    }

    return NextResponse.json({
      status: "success",
      data: {
        cleared: true,
        persisted: true,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
