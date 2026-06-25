import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import type { ProfileData } from "@/types/profile"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    const [plansRes, bookmarksRes, achievementsRes, interviewsRes, activityRes] =
      await Promise.all([
        supabase.from("plans").select("*").eq("user_id", userId),
        supabase.from("bookmarks").select("*").eq("user_id", userId),
        supabase.from("achievements").select("*").eq("user_id", userId),
        supabase.from("interviews").select("*").eq("user_id", userId),
        supabase.from("activity_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
      ])

    return NextResponse.json({
      status: "success",
      data: {
        plans: plansRes.data ?? [],
        bookmarks: bookmarksRes.data ?? [],
        achievements: achievementsRes.data ?? [],
        interviews: interviewsRes.data ?? [],
        activityEvents: activityRes.data ?? [],
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

const SyncProfileSchema = z.object({
  plans: z.array(z.object({
    nct_code: z.string(),
    nct_title: z.string(),
    level: z.string().nullish(),
    goals: z.any(),
    stages: z.any(),
    completed_steps: z.any().optional(),
    status: z.string().optional(),
  })),
  bookmarks: z.array(z.object({
    nct_code: z.string(),
    nct_title: z.string(),
    institution: z.string().optional(),
    city: z.string().optional(),
  })),
  achievements: z.array(z.object({
    achievement_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
  })),
  interviews: z.array(z.object({
    nct_code: z.string(),
    nct_title: z.string(),
    questions: z.any(),
    summary: z.string().nullish(),
    level: z.string().nullish(),
  })),
  activityEvents: z.array(z.object({
    event_type: z.string(),
    label: z.string().optional(),
    metadata: z.any().optional(),
  })),
  sessionId: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = SyncProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { status: "error", error: "Необходимо войти в аккаунт" },
        { status: 401 },
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { status: "error", error: "Необходимо войти в аккаунт" },
        { status: 401 },
      )
    }

    const { plans, bookmarks, achievements, interviews, activityEvents } = parsed.data

    const results: Record<string, { success: number; errors: number }> = {
      plans: { success: 0, errors: 0 },
      bookmarks: { success: 0, errors: 0 },
      achievements: { success: 0, errors: 0 },
      interviews: { success: 0, errors: 0 },
      activityEvents: { success: 0, errors: 0 },
    }

    await supabase.from("plans").delete().eq("user_id", user.id)
    await supabase.from("interviews").delete().eq("user_id", user.id)

    for (const plan of plans) {
      const { error } = await supabase.from("plans").insert({
        user_id: user.id,
        nct_code: plan.nct_code,
        nct_title: plan.nct_title,
        level: plan.level,
        goals: plan.goals,
        stages: plan.stages,
        completed_steps: Array.isArray(plan.completed_steps) ? plan.completed_steps : [],
        status: plan.status || "active",
      })
      if (error) results.plans.errors++
      else results.plans.success++
    }

    for (const bookmark of bookmarks) {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        ...bookmark,
      })
      if (error) results.bookmarks.errors++
      else results.bookmarks.success++
    }

    for (const achievement of achievements) {
      const { error } = await supabase.from("achievements").insert({
        user_id: user.id,
        ...achievement,
      })
      if (error) results.achievements.errors++
      else results.achievements.success++
    }

    for (const interview of interviews) {
      const { error } = await supabase.from("interviews").insert({
        user_id: user.id,
        ...interview,
        questions: JSON.stringify(interview.questions),
      })
      if (error) results.interviews.errors++
      else results.interviews.success++
    }

    for (const event of activityEvents) {
      const { error } = await supabase.from("activity_events").insert({
        user_id: user.id,
        ...event,
        metadata: event.metadata ? JSON.stringify(event.metadata) : "{}",
      })
      if (error) results.activityEvents.errors++
      else results.activityEvents.success++
    }

    let hasErrors = false
    for (const key of Object.keys(results)) {
      if (results[key].errors > 0) hasErrors = true
    }

    if (hasErrors) {
      return NextResponse.json({
        status: "partial",
        data: results,
        error: "Некоторые данные не удалось синхронизировать",
      })
    }

    return NextResponse.json({ status: "success", data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
