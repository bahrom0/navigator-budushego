import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"

export const dynamic = "force-dynamic"

const CreateConversationSchema = z.object({
  participant_id: z.string().uuid(),
  initial_message: z.string().min(1).max(5000).optional(),
})

export async function GET() {
  try {
    const userId = await requireUsername()
    const supabase = await createClient()

    const { data: conversations } = await supabase
      .from("conversations")
      .select(`
        *,
        conversation_members!inner(*)
      `)
      .eq("conversation_members.user_id", userId)
      .order("last_message_at", { ascending: false })

    if (!conversations) {
      return NextResponse.json({ status: "success", data: [] })
    }

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("id, content, message_type, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .is("deleted_at", null)
          .gt("created_at", conv.conversation_members.find((m: any) => m.user_id === userId)?.last_read_at ?? "1970-01-01")

        const otherMemberIds = conv.conversation_members
          .filter((m: any) => m.user_id !== userId)
          .map((m: any) => m.user_id)

        let otherMember = null
        if (otherMemberIds.length > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, user_id, username, email, name, level, avatar_url")
            .eq("user_id", otherMemberIds[0])
            .maybeSingle()
          otherMember = profile ?? null
        }

        return {
          id: conv.id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message_at: conv.last_message_at,
          is_group: conv.is_group,
          title: conv.title,
          last_message: lastMessage ?? null,
          unread_count: unreadCount ?? 0,
          other_member: otherMember,
        }
      }),
    )

    return NextResponse.json({ status: "success", data: enriched })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUsername()
    const supabase = await createAdminClient()

    const body = await request.json()
    const parsed = CreateConversationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const { participant_id, initial_message } = parsed.data

    if (participant_id === userId) {
      return NextResponse.json({ status: "error", error: "Cannot chat with yourself" }, { status: 400 })
    }

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("user_id, username")
      .eq("user_id", participant_id)
      .single()

    if (!targetProfile?.username) {
      return NextResponse.json({ status: "error", error: "User not found or has no username" }, { status: 404 })
    }

    const { data: existingConv, error: existingError } = await supabase
      .rpc("find_direct_conversation", {
        p_user_id: userId,
        p_participant_id: participant_id,
      })

    if (!existingError && existingConv) {
      const convId = Array.isArray(existingConv) ? existingConv[0] : existingConv
      return NextResponse.json({
        status: "success",
        data: { id: convId, existing: true },
      })
    }

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ is_group: false })
      .select()
      .single()

    if (convError || !conv) {
      return NextResponse.json({ status: "error", error: convError?.message ?? "Failed to create" }, { status: 500 })
    }

    const members = [
      { conversation_id: conv.id, user_id: userId, role: "admin" },
      { conversation_id: conv.id, user_id: participant_id, role: "member" },
    ]

    const { error: memberError } = await supabase
      .from("conversation_members")
      .insert(members)

    if (memberError) {
      await supabase.from("conversations").delete().eq("id", conv.id)
      return NextResponse.json({ status: "error", error: memberError.message }, { status: 500 })
    }

    if (initial_message) {
      const clientMessageId = crypto.randomUUID()
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conv.id,
          sender_id: userId,
          client_message_id: clientMessageId,
          content: initial_message,
          message_type: "text",
        })

      if (msgError) {
        const message = msgError instanceof Error ? msgError.message : "Failed to send message"
        return NextResponse.json({ status: "error", error: message }, { status: 500 })
      }
    }

    return NextResponse.json({
      status: "success",
      data: { id: conv.id, existing: false },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
