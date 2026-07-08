import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const CoachMessageSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid().optional(),
  role: z.enum(["user", "coach"]),
  content: z.string(),
  type: z.enum(["text", "task_reminder", "mini_test", "encouragement", "progress_update"]).default("text"),
  timestamp: z.number().int().optional(),
  miniTest: z.any().optional(),
})

const CoachMessagePatchSchema = z.object({
  id: z.string().uuid(),
  content: z.string().optional(),
  miniTest: z.any().optional(),
})

function unauthorized() {
  return NextResponse.json({ status: "unauthorized", data: null }, { status: 401 })
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return unauthorized()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorized()

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get("goalId")

    let query = supabase
      .from("coach_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100)

    if (goalId) {
      query = query.eq("goal_id", goalId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ status: "success", data: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return unauthorized()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorized()

    const body = await request.json()
    const parsed = CoachMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message, data: null }, { status: 400 })
    }

    const payload = parsed.data
    const metadata = payload.miniTest ? { miniTest: payload.miniTest } : {}

    const { data, error } = await supabase
      .from("coach_messages")
      .upsert({
        id: payload.id,
        user_id: user.id,
        goal_id: payload.goalId ?? null,
        role: payload.role,
        content: payload.content,
        message_type: payload.type,
        metadata,
        created_at: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ status: "success", data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return unauthorized()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorized()

    const body = await request.json()
    const parsed = CoachMessagePatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message, data: null }, { status: 400 })
    }

    const { data: existing, error: readError } = await supabase
      .from("coach_messages")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("id", parsed.data.id)
      .single()

    if (readError) throw readError

    const nextMetadata =
      parsed.data.miniTest !== undefined
        ? {
            ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
            miniTest: parsed.data.miniTest,
          }
        : existing?.metadata ?? {}

    const updatePayload: Record<string, unknown> = {
      metadata: nextMetadata,
    }

    if (parsed.data.content !== undefined) {
      updatePayload.content = parsed.data.content
    }

    const { data, error } = await supabase
      .from("coach_messages")
      .update(updatePayload)
      .eq("user_id", user.id)
      .eq("id", parsed.data.id)
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ status: "success", data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
