import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"
import { requireMember } from "@/lib/user-chat/membership"
import type { AttachmentRecord } from "@/lib/user-chat/types"

export const dynamic = "force-dynamic"

const SendMessageSchema = z.object({
  client_message_id: z.string().min(1),
  content: z.string().max(10000).optional(),
  message_type: z.enum(["text", "image", "video", "audio", "document", "system"]).default("text"),
  reply_to_message_id: z.string().uuid().nullable().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUsername()
    const { id } = await params
    await requireMember(id, userId)

    const supabase = await createClient()
    const url = new URL(request.url)
    const after = url.searchParams.get("after")
    const before = url.searchParams.get("before")
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100)

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)

    if (after) {
      const [cursorCreatedAt, cursorId] = after.split("|")
      query = query
        .or(`created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(limit)
    } else if (before) {
      const [cursorCreatedAt, cursorId] = before.split("|")
      query = query
        .or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit)
    } else {
      query = query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit)
    }

    const { data: messages, error } = await query

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 })
    }

    const orderedMessages =
      after || before ? [...(messages ?? [])].reverse() : [...(messages ?? [])].reverse()

    const hasMore = orderedMessages.length === limit
    const messageIds = orderedMessages.map((m) => m.id)
    let attachments: AttachmentRecord[] = []

    if (messageIds.length > 0) {
      const { data: atts } = await supabase
        .from("attachments")
        .select("*")
        .in("message_id", messageIds)
      attachments = atts ?? []
    }

    const senderIds = [...new Set(orderedMessages.map((m) => m.sender_id))]
    const { data: senders } = await supabase
      .from("profiles")
      .select("user_id, username, email, name")
      .in("user_id", senderIds)

    const messagesWithAttachments = orderedMessages.map((msg) => ({
      ...msg,
      attachments: attachments.filter((a) => a.message_id === msg.id),
      sender: (senders ?? []).find((s) => s.user_id === msg.sender_id) ?? null,
    }))

    return NextResponse.json({
      status: "success",
      data: messagesWithAttachments,
      has_more: hasMore,
    })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUsername()
    const { id } = await params
    await requireMember(id, userId)

    const supabase = await createClient()
    const body = await request.json()
    const parsed = SendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const { client_message_id, content, message_type, reply_to_message_id } = parsed.data

    const { data: msg, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        sender_id: userId,
        client_message_id,
        content: content ?? null,
        message_type,
        reply_to_message_id: reply_to_message_id ?? null,
      })
      .select()
      .maybeSingle()

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existing } = await supabase
          .from("messages")
          .select("*")
          .eq("client_message_id", client_message_id)
          .single()
        return NextResponse.json({ status: "success", data: existing })
      }
      return NextResponse.json({ status: "error", error: insertError.message }, { status: 500 })
    }

    if (!msg) {
      return NextResponse.json({ status: "error", error: "Insert failed" }, { status: 500 })
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json({ status: "success", data: msg }, { status: 201 })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
