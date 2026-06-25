import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { nctCode, completedSteps, status } = body

    if (!nctCode) {
      return NextResponse.json({ status: "error", error: "nctCode required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const updateData: Record<string, unknown> = {}
    if (Array.isArray(completedSteps)) {
      updateData.completed_steps = completedSteps
    }
    if (status && typeof status === "string") {
      updateData.status = status
    }

    const { data: updated, error } = await supabase
      .from("plans")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("nct_code", nctCode)
      .select("id")

    // If no record found, upsert a new one
    if (!error && (!updated || updated.length === 0)) {
      const { data: inserted, error: insertErr } = await supabase
        .from("plans")
        .insert({
          user_id: user.id,
          nct_code: nctCode,
          ...updateData,
        })
        .select("id")

      if (insertErr) {
        return NextResponse.json({ status: "error", error: insertErr.message }, { status: 500 })
      }
      return NextResponse.json({ status: "success", data: inserted })
    }

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
