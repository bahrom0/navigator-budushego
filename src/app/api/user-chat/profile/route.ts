import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  name: z.string().max(80).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, name, bio, avatar_url")
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      status: "success",
      data: {
        username: profile?.username ?? null,
        name: profile?.name ?? null,
        bio: profile?.bio ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = ProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.username !== undefined) update.username = parsed.data.username
    if (parsed.data.name !== undefined) update.name = parsed.data.name
    if (parsed.data.bio !== undefined) update.bio = parsed.data.bio
    if (parsed.data.avatar_url !== undefined) update.avatar_url = parsed.data.avatar_url

    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .single()

    if (existing) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(update)
        .eq("user_id", user.id)

      if (updateError) {
        if (updateError.code === "23505") {
          return NextResponse.json({ status: "error", error: "Username already taken" }, { status: 409 })
        }
        return NextResponse.json({ status: "error", error: updateError.message }, { status: 500 })
      }
    } else {
      const insert: Record<string, unknown> = { user_id: user.id, ...update }
      const { error: insertError } = await supabase
        .from("profiles")
        .insert(insert)

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json({ status: "error", error: "Username already taken" }, { status: 409 })
        }
        return NextResponse.json({ status: "error", error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      status: "success",
      data: {
        username: parsed.data.username,
        name: parsed.data.name,
        bio: parsed.data.bio,
        avatar_url: parsed.data.avatar_url,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
