import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PlanBundle, DailyPlanRecord } from "@/types/admission"
import type { CoachDayTask, CoachRoadmap } from "@/types/coach"

export const dynamic = "force-dynamic"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function toDailyPlanRecord(row: Record<string, unknown>, tasks: CoachDayTask[]): DailyPlanRecord {
  const completedTaskIds: string[] = Array.isArray(row.completed_task_ids)
    ? row.completed_task_ids
    : typeof row.completed_task_ids === "string"
      ? JSON.parse(row.completed_task_ids as string)
      : []

  const skippedTaskIds: string[] = Array.isArray(row.skipped_task_ids)
    ? row.skipped_task_ids
    : typeof row.skipped_task_ids === "string"
      ? JSON.parse(row.skipped_task_ids as string)
      : []

  return {
    id: String(row.id),
    userId: typeof row.user_id === "string" ? row.user_id : undefined,
    sessionId: typeof row.session_id === "string" ? row.session_id : undefined,
    goalId: String(row.goal_id),
    roadmapId: String(row.roadmap_id),
    planId: typeof row.plan_id === "string" ? row.plan_id : undefined,
    planDate: String(row.plan_date),
    weekId: String(row.week_id),
    weekNumber: Number(row.week_number ?? 1),
    title: String(row.title ?? ""),
    tasks,
    completedTaskIds,
    skippedTaskIds: skippedTaskIds.length ? skippedTaskIds : undefined,
    createdAt: row.created_at ? Date.parse(String(row.created_at)) : Date.now(),
    updatedAt: row.updated_at ? Date.parse(String(row.updated_at)) : Date.now(),
    previousDate: typeof row.previous_date === "string" ? row.previous_date : undefined,
    nextDate: typeof row.next_date === "string" ? row.next_date : undefined,
    stats: typeof row.stats === "object" && row.stats !== null ? row.stats as Record<string, unknown> : null,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ status: "success", data: null })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ status: "success", data: null })
    }

    const [profileRes, goalRes, planRes] = await Promise.all([
      supabase.from("profiles").select("active_goal_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("admission_goals").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("plans").select("*").eq("user_id", user.id).eq("plan_type", "general").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ])

    const activeGoalId =
      typeof profileRes.data?.active_goal_id === "string" && profileRes.data.active_goal_id.length > 0
        ? profileRes.data.active_goal_id
        : typeof goalRes.data?.id === "string"
          ? goalRes.data.id
          : null

    let roadmapQuery = supabase
      .from("roadmaps")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)

    let dailyQuery = supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("plan_date", { ascending: false })
      .limit(14)

    if (activeGoalId) {
      roadmapQuery = roadmapQuery.eq("goal_id", activeGoalId)
      dailyQuery = dailyQuery.eq("goal_id", activeGoalId)
    }

    const [roadmapRes, dailyRes] = await Promise.all([
      roadmapQuery.maybeSingle(),
      dailyQuery,
    ])

    const dailyPlans = dailyRes.data ?? []
    const dailyPlanIds = dailyPlans.map((row) => row.id)
    const tasksRes = dailyPlanIds.length > 0
      ? await supabase.from("daily_tasks").select("*").eq("user_id", user.id).in("daily_plan_id", dailyPlanIds).order("position", { ascending: true })
      : { data: [] as Record<string, unknown>[] }

    const tasksByPlan = new Map<string, CoachDayTask[]>()
    for (const task of tasksRes.data ?? []) {
      const planId = String(task.daily_plan_id)
      const list = tasksByPlan.get(planId) ?? []
      list.push({
        id: String(task.task_id),
        title: String(task.title),
        type: task.type === "practice" || task.type === "review" || task.type === "test" ? task.type : "study",
        description: String(task.description ?? ""),
        duration: typeof task.duration_minutes === "number" ? task.duration_minutes : undefined,
        completed: task.completed === true || task.status === "completed",
        completedAt: task.completed_at ? Date.parse(String(task.completed_at)) : undefined,
        position: typeof task.position === "number" ? task.position : undefined,
        metadata: typeof task.metadata === "object" && task.metadata !== null ? task.metadata as Record<string, unknown> : undefined,
      })
      tasksByPlan.set(planId, list)
    }

    const history = dailyPlans.map((row) => toDailyPlanRecord(row, tasksByPlan.get(String(row.id)) ?? []))
    const today = history.find((plan) => plan.planDate === todayIso()) ?? history[0] ?? null

    const roadmap = roadmapRes.data
      ? ({
          id: String(roadmapRes.data.id),
          goalId: String(roadmapRes.data.goal_id),
          weeks: Array.isArray(roadmapRes.data.weeks) ? roadmapRes.data.weeks : [],
          durationWeeks: typeof roadmapRes.data.duration_weeks === "number" ? roadmapRes.data.duration_weeks : 12,
          title: typeof roadmapRes.data.title === "string" ? roadmapRes.data.title : undefined,
          nctCode: typeof roadmapRes.data.nct_code === "string" ? roadmapRes.data.nct_code : undefined,
          nctTitle: typeof roadmapRes.data.nct_title === "string" ? roadmapRes.data.nct_title : undefined,
          planSnapshot: typeof roadmapRes.data.plan_snapshot === "object" && roadmapRes.data.plan_snapshot !== null
            ? roadmapRes.data.plan_snapshot as Record<string, unknown>
            : null,
          diagnosticSnapshot: typeof roadmapRes.data.diagnostic_snapshot === "object" && roadmapRes.data.diagnostic_snapshot !== null
            ? roadmapRes.data.diagnostic_snapshot as Record<string, unknown>
            : null,
          generationContext: typeof roadmapRes.data.generation_context === "object" && roadmapRes.data.generation_context !== null
            ? roadmapRes.data.generation_context as Record<string, unknown>
            : null,
          currentWeekNumber: typeof roadmapRes.data.current_week_number === "number" ? roadmapRes.data.current_week_number : 1,
          status: typeof roadmapRes.data.status === "string" ? roadmapRes.data.status : "active",
          createdAt: roadmapRes.data.created_at ? Date.parse(String(roadmapRes.data.created_at)) : Date.now(),
          updatedAt: roadmapRes.data.updated_at ? Date.parse(String(roadmapRes.data.updated_at)) : Date.now(),
        } as CoachRoadmap)
      : null

    const bundle: PlanBundle = {
      goal: goalRes.data ?? null,
      plan: planRes.data ?? null,
      roadmap,
      today,
      history,
    }

    return NextResponse.json({
      status: "success",
      data: {
        activeGoalId,
        bundle,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
