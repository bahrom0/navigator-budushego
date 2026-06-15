import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"

export const dynamic = "force-dynamic"

const EditMessageSchema = z.object({
  content: z.string().max(10000),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const userId = await requireUsername()
    const { id, messageId } = await params

    const supabase = await createClient()

    const { data: msg } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("conversation_id", id)
      .single()

    if (!msg) {
      return NextResponse.json({ status: "error", error: "Message not found" }, { status: 404 })
    }

    if (msg.sender_id !== userId) {
      return NextResponse.json({ status: "error", error: "Not your message" }, { status: 403 })
    }

    if (msg.deleted_at) {
      return NextResponse.json({ status: "error", error: "Message is deleted" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = EditMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const { content } = parsed.data

    const { error: editLogError } = await supabase
      .from("message_edits")
      .insert({
        message_id: messageId,
        previous_content: msg.content ?? "",
      })

    if (editLogError) {
      return NextResponse.json({ status: "error", error: editLogError.message }, { status: 500 })
    }

    const { data: updated, error: updateError } = await supabase
      .from("messages")
      .update({
        content,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ status: "error", error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data: updated })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const userId = await requireUsername()
    const { id, messageId } = await params

    const supabase = await createClient()

    const { data: msg } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("conversation_id", id)
      .single()

    if (!msg) {
      return NextResponse.json({ status: "error", error: "Message not found" }, { status: 404 })
    }

    if (msg.sender_id !== userId) {
      return NextResponse.json({ status: "error", error: "Not your message" }, { status: 403 })
    }

    if (msg.deleted_at) {
      return NextResponse.json({ status: "error", error: "Message already deleted" }, { status: 400 })
    }

    const { error: softDeleteError } = await supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)

    if (softDeleteError) {
      return NextResponse.json({ status: "error", error: softDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ status: "success", data: { id: messageId, deleted_at: new Date().toISOString() } })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
