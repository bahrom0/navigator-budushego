import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { nctCode } = await request.json()
    if (!nctCode || typeof nctCode !== "string") {
      return NextResponse.json({ status: "error", error: "nctCode required", data: null }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ status: "success", data: null })
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ status: "success", data: null })
    }

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("nct_code", nctCode)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ status: "success", data: null })
      }
      return NextResponse.json({ status: "error", error: error.message, data: null }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
