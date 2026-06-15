import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200).default("Новый чат"),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: parsed.data.title })
      .select("id, title, created_at, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
