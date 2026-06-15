import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUsername()

    const { id: userId } = await context.params
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { status: "error", error: "Invalid user id" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, username, name, bio, avatar_url, level, last_seen_at")
      .eq("user_id", userId)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { status: "error", error: "User not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      status: "success",
      data: {
        user_id: profile.user_id,
        username: profile.username,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        level: profile.level ?? "beginner",
        last_seen_at: profile.last_seen_at ?? null,
      },
    })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json(
        { status: "error", error: "Username required" },
        { status: 428 },
      )
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
