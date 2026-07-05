import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

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
        supabase.from("activity_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(500),
      ])

    const readError = plansRes.error
      ?? bookmarksRes.error
      ?? achievementsRes.error
      ?? interviewsRes.error
      ?? activityRes.error

    if (readError) throw readError

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
    id: z.string().uuid().optional(),
    goal_id: z.string().uuid().nullable().optional(),
    nct_code: z.string(),
    nct_title: z.string(),
    level: z.string().nullish(),
    goals: z.any(),
    stages: z.any(),
    completed_steps: z.any().optional(),
    status: z.string().optional(),
    plan_type: z.string().optional(),
    roadmap_id: z.string().nullable().optional(),
    updated_at: z.string().optional(),
  })),
  bookmarks: z.array(z.object({
    nct_code: z.string(),
    nct_title: z.string(),
    institution: z.string().optional(),
    city: z.string().optional(),
  })),
  deleted_bookmark_codes: z.array(z.string().min(1)).default([]),
  achievements: z.array(z.object({
    achievement_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
  })),
  interviews: z.array(z.object({
    id: z.string().uuid().optional(),
    goal_id: z.string().uuid().nullable().optional(),
    nct_code: z.string(),
    nct_title: z.string(),
    questions: z.any(),
    summary: z.string().nullish(),
    level: z.string().nullish(),
  })),
  activityEvents: z.array(z.object({
    client_event_id: z.string().min(1),
    event_type: z.string(),
    label: z.string().optional(),
    is_priority: z.boolean().optional(),
    priority_rank: z.number().int().optional(),
    metadata: z.any().optional(),
    occurred_at: z.string().datetime().optional(),
  })),
  sessionId: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body?.plans)) {
      body.plans = body.plans.filter((plan: unknown) => {
        if (!plan || typeof plan !== "object") return false
        const candidate = plan as { nct_code?: unknown; nct_title?: unknown }
        return typeof candidate.nct_code === "string"
          && candidate.nct_code.trim().length > 0
          && typeof candidate.nct_title === "string"
          && candidate.nct_title.trim().length > 0
      })
    }
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

    const {
      plans,
      bookmarks,
      deleted_bookmark_codes: deletedBookmarkCodes,
      achievements,
      interviews,
      activityEvents,
    } = parsed.data

    const results: Record<string, { success: number; errors: number }> = {
      plans: { success: 0, errors: 0 },
      bookmarks: { success: 0, errors: 0 },
      achievements: { success: 0, errors: 0 },
      interviews: { success: 0, errors: 0 },
      activityEvents: { success: 0, errors: 0 },
    }

    const planRows = plans.map((plan) => ({
        user_id: user.id,
        goal_id: plan.goal_id ?? null,
        nct_code: plan.nct_code,
        nct_title: plan.nct_title,
        level: plan.level,
        goals: plan.goals,
        stages: plan.stages,
        completed_steps: Array.isArray(plan.completed_steps) ? plan.completed_steps : [],
        status: plan.status || "active",
        plan_type: plan.plan_type || "general",
        roadmap_id: plan.roadmap_id ?? null,
        updated_at: plan.updated_at || new Date().toISOString(),
    }))

    const goalPlans = planRows.filter((plan) => plan.goal_id !== null)
    if (goalPlans.length > 0) {
      const { error } = await supabase
        .from("plans")
        .upsert(goalPlans, { onConflict: "user_id,goal_id,plan_type" })
      if (error) results.plans.errors += goalPlans.length
      else results.plans.success += goalPlans.length
    }

    // Legacy plans do not have a domain goal key. Keep compatibility without
    // allowing the client snapshot to delete canonical server plans.
    for (const plan of planRows.filter((candidate) => candidate.goal_id === null)) {
      const { data: existing, error: findError } = await supabase
        .from("plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("nct_code", plan.nct_code)
        .eq("plan_type", plan.plan_type)
        .maybeSingle()

      if (findError) {
        results.plans.errors++
        continue
      }

      const { error } = existing?.id
        ? await supabase.from("plans").update(plan).eq("id", existing.id)
        : await supabase.from("plans").insert(plan)
      if (error) results.plans.errors++
      else results.plans.success++
    }

    if (bookmarks.length > 0) {
      const { error } = await supabase.from("bookmarks").upsert(bookmarks.map((bookmark) => ({
        user_id: user.id,
        ...bookmark,
      })), { onConflict: "user_id,nct_code" })
      if (error) results.bookmarks.errors += bookmarks.length
      else results.bookmarks.success += bookmarks.length
    }

    if (deletedBookmarkCodes.length > 0) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .in("nct_code", deletedBookmarkCodes)
      if (error) results.bookmarks.errors += deletedBookmarkCodes.length
      else results.bookmarks.success += deletedBookmarkCodes.length
    }

    if (achievements.length > 0) {
      const { error } = await supabase.from("achievements").upsert(achievements.map((achievement) => ({
        user_id: user.id,
        ...achievement,
      })), { onConflict: "user_id,achievement_id" })
      if (error) results.achievements.errors += achievements.length
      else results.achievements.success += achievements.length
    }

    if (interviews.length > 0) {
      const { error } = await supabase.from("interviews").upsert(interviews.map((interview) => ({
        user_id: user.id,
        goal_id: interview.goal_id ?? null,
        nct_code: interview.nct_code,
        nct_title: interview.nct_title,
        questions: interview.questions,
        summary: interview.summary ?? null,
        level: interview.level ?? null,
        updated_at: new Date().toISOString(),
      })), { onConflict: "user_id,nct_code" })
      if (error) results.interviews.errors += interviews.length
      else results.interviews.success += interviews.length
    }

    if (activityEvents.length > 0) {
      const { error } = await supabase.from("activity_events").upsert(activityEvents.map((event) => ({
        user_id: user.id,
        client_event_id: event.client_event_id,
        event_type: event.event_type,
        label: event.label,
        is_priority: event.is_priority ?? false,
        priority_rank: event.priority_rank ?? 0,
        metadata: event.metadata ?? {},
        occurred_at: event.occurred_at ?? new Date().toISOString(),
      })), {
        onConflict: "user_id,client_event_id",
        ignoreDuplicates: true,
      })
      if (error) results.activityEvents.errors += activityEvents.length
      else results.activityEvents.success += activityEvents.length
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
