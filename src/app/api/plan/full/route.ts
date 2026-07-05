import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ActiveGoalBundle, AdmissionGoalRecord, DailyPlanRecord } from "@/types/admission"
import type { CoachDayTask, CoachRoadmap } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { RecommendationSnapshot } from "@/types/recommendations"

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

function toAdmissionGoalRecord(row: Record<string, unknown> | null | undefined): AdmissionGoalRecord | null {
  if (!row) return null

  const id = typeof row.id === "string" ? row.id : null
  const nctCode = typeof row.nct_code === "string" ? row.nct_code : null
  const nctTitle = typeof row.nct_title === "string" ? row.nct_title : null

  if (!id || !nctCode || !nctTitle) return null

  return {
    id,
    nctCode,
    nctTitle,
    university: typeof row.university === "string" ? row.university : undefined,
    profession: typeof row.profession === "string" ? row.profession : undefined,
    city: typeof row.city === "string" ? row.city : undefined,
    setAt: row.created_at ? Date.parse(String(row.created_at)) : Date.now(),
    status:
      row.status === "archived" || row.status === "completed"
        ? row.status
        : "active",
    userId: typeof row.user_id === "string" ? row.user_id : undefined,
    sessionId: typeof row.session_id === "string" ? row.session_id : undefined,
    archivedAt: row.archived_at ? Date.parse(String(row.archived_at)) : undefined,
  }
}

function toDevelopmentPlan(row: Record<string, unknown> | null | undefined): (DevelopmentPlan & {
  id?: string
  goal_id?: string | null
  roadmap_id?: string | null
}) | null {
  if (!row) return null

  const nctCode = typeof row.nct_code === "string" ? row.nct_code : null
  const nctTitle = typeof row.nct_title === "string" ? row.nct_title : null

  if (!nctCode || !nctTitle) return null

  const goals = Array.isArray(row.goals)
    ? row.goals
    : typeof row.goals === "string"
      ? JSON.parse(row.goals)
      : []
  const stages = Array.isArray(row.stages)
    ? row.stages
    : typeof row.stages === "string"
      ? JSON.parse(row.stages)
      : []

  return {
    id: typeof row.id === "string" ? row.id : undefined,
    goal_id: typeof row.goal_id === "string" ? row.goal_id : null,
    roadmap_id: typeof row.roadmap_id === "string" ? row.roadmap_id : null,
    nctCode,
    nctTitle,
    level:
      row.level === "intermediate" || row.level === "advanced"
        ? row.level
        : "beginner",
    goals: Array.isArray(goals) ? goals : [],
    stages: Array.isArray(stages) ? stages : [],
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

    const profileRes = await supabase.from("profiles").select("active_goal_id").eq("user_id", user.id).maybeSingle()
    if (profileRes.error) throw profileRes.error

    const profileGoalId =
      typeof profileRes.data?.active_goal_id === "string" && profileRes.data.active_goal_id.length > 0
        ? profileRes.data.active_goal_id
        : null

    let goalRes = profileGoalId
      ? await supabase
          .from("admission_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("id", profileGoalId)
          .eq("status", "active")
          .maybeSingle()
      : await supabase
          .from("admission_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
    if (goalRes.error) throw goalRes.error

    if (!goalRes.data) {
      goalRes = await supabase
        .from("admission_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (goalRes.error) throw goalRes.error
    }

    const activeGoalId = typeof goalRes.data?.id === "string" ? goalRes.data.id : null

    if (activeGoalId && activeGoalId !== profileGoalId) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ active_goal_id: activeGoalId, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
      if (profileUpdateError) throw profileUpdateError
    }

    if (!activeGoalId) {
      const bundle: ActiveGoalBundle = {
        goal: null,
        recommendationSnapshot: null,
        generalPlan: null,
        roadmap: null,
        todayPlan: null,
        history: [],
        historySummary: {
          daysTracked: 0,
          tasksCompleted: 0,
          tasksTotal: 0,
        },
        communityContext: null,
      }

      return NextResponse.json({ status: "success", data: { activeGoalId: null, bundle } })
    }

    let planQuery = supabase
      .from("plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_type", "general")
      .order("created_at", { ascending: false })
      .limit(1)

    planQuery = planQuery.eq("goal_id", activeGoalId)
    const planRes = await planQuery.maybeSingle()
    if (planRes.error) throw planRes.error

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

    roadmapQuery = roadmapQuery.eq("goal_id", activeGoalId)
    dailyQuery = dailyQuery.eq("goal_id", activeGoalId)

    const [roadmapRes, dailyRes] = await Promise.all([
      roadmapQuery.maybeSingle(),
      dailyQuery,
    ])
    if (roadmapRes.error) throw roadmapRes.error
    if (dailyRes.error) throw dailyRes.error

    const dailyPlans = dailyRes.data ?? []
    const dailyPlanIds = dailyPlans.map((row) => row.id)
    let dailyTasks: Record<string, unknown>[] = []
    if (dailyPlanIds.length > 0) {
      const tasksRes = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user.id)
        .in("daily_plan_id", dailyPlanIds)
        .order("position", { ascending: true })
      if (tasksRes.error) throw tasksRes.error
      dailyTasks = (tasksRes.data ?? []) as Record<string, unknown>[]
    }

    const tasksByPlan = new Map<string, CoachDayTask[]>()
    for (const task of dailyTasks) {
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

    const goal = toAdmissionGoalRecord(goalRes.data)
    const tasksCompleted = history.reduce(
      (sum, dailyPlan) => sum + dailyPlan.tasks.filter((task) => task.completed).length,
      0,
    )
    const tasksTotal = history.reduce((sum, dailyPlan) => sum + dailyPlan.tasks.length, 0)
    const currentWeekNumber = roadmap?.currentWeekNumber
      ?? roadmap?.weeks.find((week) => week.status === "active")?.number

    const bundle: ActiveGoalBundle = {
      goal,
      recommendationSnapshot:
        typeof goalRes.data?.goal_context === "object"
        && goalRes.data.goal_context !== null
        && typeof (goalRes.data.goal_context as Record<string, unknown>).recommendationSnapshot === "object"
          ? (goalRes.data.goal_context as { recommendationSnapshot: RecommendationSnapshot }).recommendationSnapshot
          : null,
      generalPlan: toDevelopmentPlan(planRes.data),
      roadmap,
      todayPlan: today,
      history,
      historySummary: {
        daysTracked: history.length,
        tasksCompleted,
        tasksTotal,
        lastPlanDate: history[0]?.planDate,
      },
      communityContext: goal
        ? {
            goalId: goal.id,
            nctCode: goal.nctCode,
            university: goal.university,
            city: goal.city,
            currentWeekNumber,
          }
        : null,
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
