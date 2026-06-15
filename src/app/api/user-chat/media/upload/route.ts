import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"
import { requireMember } from "@/lib/user-chat/membership"

export const dynamic = "force-dynamic"

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "text/plain": "document",
}

const MAX_FILE_SIZE = 50 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const userId = await requireUsername()

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const conversationId = formData.get("conversation_id") as string | null
    const clientMessageId = formData.get("client_message_id") as string | null

    if (!file || !conversationId || !clientMessageId) {
      return NextResponse.json(
        { status: "error", error: "Missing file, conversation_id, or client_message_id" },
        { status: 400 },
      )
    }

    await requireMember(conversationId, userId)

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ status: "error", error: "File too large (max 50MB)" }, { status: 400 })
    }

    const messageType = ALLOWED_TYPES[file.type]
    if (!messageType) {
      return NextResponse.json({ status: "error", error: "Unsupported file type" }, { status: 400 })
    }

    const supabase = await createClient()

    const fileExt = file.name.split(".").pop() ?? "bin"
    const storagePath = `user-chat/${conversationId}/${clientMessageId}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ status: "error", error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(storagePath)

    const { data: msg, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        client_message_id: clientMessageId,
        content: null,
        message_type: messageType,
      })
      .select()
      .single()

    if (msgError || !msg) {
      await supabase.storage.from("chat-media").remove([storagePath])
      return NextResponse.json({ status: "error", error: msgError?.message ?? "Failed to create message" }, { status: 500 })
    }

    const { error: attError } = await supabase
      .from("attachments")
      .insert({
        message_id: msg.id,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        thumbnail_url: messageType === "image" ? urlData.publicUrl : null,
      })

    if (attError) {
      await supabase.from("messages").delete().eq("id", msg.id)
      await supabase.storage.from("chat-media").remove([storagePath])
      return NextResponse.json({ status: "error", error: attError.message }, { status: 500 })
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId)

    const { data: attachment } = await supabase
      .from("attachments")
      .select("*")
      .eq("message_id", msg.id)
      .single()

    return NextResponse.json({
      status: "success",
      data: {
        ...msg,
        attachments: attachment ? [attachment] : [],
        url: urlData.publicUrl,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
