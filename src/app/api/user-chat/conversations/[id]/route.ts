import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"
import { requireMember } from "@/lib/user-chat/membership"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUsername()
    const { id } = await params
    await requireMember(id, userId)

    const supabase = await createClient()

    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single()

    if (!conv) {
      return NextResponse.json({ status: "error", error: "Not found" }, { status: 404 })
    }

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id, role, last_read_at, last_read_message_id")
      .eq("conversation_id", id)

    const memberIds = (members ?? []).map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, email, name, level, avatar_url")
      .in("user_id", memberIds)

    return NextResponse.json({
      status: "success",
      data: {
        ...conv,
        members: members ?? [],
        profiles: profiles ?? [],
      },
    })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
