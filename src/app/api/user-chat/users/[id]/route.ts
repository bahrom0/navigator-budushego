import { NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
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
    const admin = await createAdminClient()
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, username, name, bio, avatar_url, level, last_seen_at, active_goal_id")
      .eq("user_id", userId)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { status: "error", error: "User not found" },
        { status: 404 },
      )
    }

    let communityContext: {
      goal_id: string | null
      nct_code: string | null
      nct_title: string | null
      university: string | null
      city: string | null
      current_week_number: number | null
    } | null = null

    if (profile.active_goal_id) {
      const [{ data: goal }, { data: roadmap }] = await Promise.all([
        admin
          .from("admission_goals")
          .select("id, nct_code, nct_title, university, city")
          .eq("id", profile.active_goal_id)
          .maybeSingle(),
        admin
          .from("roadmaps")
          .select("goal_id, current_week_number")
          .eq("goal_id", profile.active_goal_id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (goal) {
        communityContext = {
          goal_id: goal.id,
          nct_code: goal.nct_code ?? null,
          nct_title: goal.nct_title ?? null,
          university: goal.university ?? null,
          city: goal.city ?? null,
          current_week_number: roadmap?.current_week_number ?? null,
        }
      }
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
        community_context: communityContext,
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
