import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { sseManager } from "@/lib/chat/sse-manager"

export const dynamic = "force-dynamic"

const AddMessageSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  type: z.enum(["text", "reminder", "quiz", "progress"]).default("text"),
})

async function getUserAndSession(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    return { error: NextResponse.json({ status: "error", error: "Not found" }, { status: 404 }) }
  }

  return { user }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { user, error } = await getUserAndSession(supabase, id)
    if (error) return error

    const url = new URL(request.url)
    const after = url.searchParams.get("after")

    let query = supabase
      .from("chat_messages")
      .select("id, session_id, role, content, type, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })

    if (after) {
      const [cursorCreatedAt, cursorId] = after.split("|")
      query = query.or(
        `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`
      )
    }

    const { data, error: dbError } = await query

    if (dbError) {
      return NextResponse.json({ status: "error", error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { user, error } = await getUserAndSession(supabase, id)
    if (error) return error

    const body = await request.json()
    const parsed = AddMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const clientId = parsed.data.id ?? crypto.randomUUID()

    const { data, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        id: clientId,
        session_id: id,
        role: parsed.data.role,
        content: parsed.data.content,
        type: parsed.data.type,
      })
      .select("id, session_id, role, content, type, created_at")
      .maybeSingle()

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existing } = await supabase
          .from("chat_messages")
          .select("id, session_id, role, content, type, created_at")
          .eq("id", clientId)
          .single()
        return NextResponse.json({ status: "success", data: existing })
      }
      return NextResponse.json({ status: "error", error: insertError.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ status: "error", error: "Insert failed" }, { status: 500 })
    }

    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)

    const cursor = `${data.created_at}|${data.id}`
    sseManager.broadcast(user.id, "message.created", data, cursor)

    return NextResponse.json({ status: "success", data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
