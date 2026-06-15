import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const UpdateSessionSchema = z.object({
  title: z.string().min(1).max(200),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = UpdateSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .update({ title: parsed.data.title, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, title, created_at, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
