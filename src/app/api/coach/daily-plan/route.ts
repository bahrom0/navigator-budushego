import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateDailyPlan } from "@/lib/ai/coach-daily-plan"
import type { CoachDiagnosticResult, CoachDayTask, CoachRoadmap } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"

export const dynamic = "force-dynamic"

const WeekTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["study", "practice", "review", "test"]),
  description: z.string(),
})

const DailyPlanRequestSchema = z.object({
  goalId: z.string().min(1, "Укажите ID цели"),
  roadmapId: z.string().min(1, "Укажите ID roadmap"),
  planId: z.string().min(1).optional(),
  weekId: z.string().min(1, "Укажите ID недели"),
  nctCode: z.string().trim().min(1, "Укажите код НЦТ").max(20),
  nctTitle: z.string().trim().min(1, "Укажите название").max(200),
  weekTitle: z.string().trim().min(1, "Укажите название недели").max(200),
  weekSubjects: z.array(z.string()).min(1, "Укажите предметы недели"),
  weekTasks: z.array(WeekTaskSchema).default([]),
  previousCompletedCount: z.number().int().min(0).optional(),
  previousSkippedCount: z.number().int().min(0).optional(),
  diagnosticResult: z.any().optional(),
  miniTestResults: z.any().optional(),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  generalPlan: z.any().optional(),
  roadmap: z.any().optional(),
  dailyHistory: z.any().optional(),
})

function mapTask(row: Record<string, unknown>) {
  return {
    id: String(row.task_id),
    title: String(row.title),
    type: row.type === "practice" || row.type === "review" || row.type === "test" ? row.type : "study",
    description: String(row.description ?? ""),
    duration: typeof row.duration_minutes === "number" ? row.duration_minutes : undefined,
    completed: row.completed === true || row.status === "completed",
    completedAt: row.completed_at ? new Date(String(row.completed_at)).getTime() : undefined,
    position: typeof row.position === "number" ? row.position : undefined,
    metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata as Record<string, unknown> : undefined,
  }
}

async function findDailyPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goalId: string,
  planDate: string,
) {
  const { data: planRow } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .eq("plan_date", planDate)
    .maybeSingle()

  if (!planRow) return null

  const tasksRes = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("daily_plan_id", planRow.id)
    .order("position", { ascending: true })

  return {
    planRow: planRow as Record<string, unknown>,
    tasks: (tasksRes.data ?? []).map(mapTask),
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = DailyPlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          error: parsed.error.issues[0]?.message ?? "Некорректные данные",
          data: null,
        },
        { status: 400 },
      )
    }

    const {
      goalId,
      roadmapId,
      planId,
      weekId,
      nctCode,
      nctTitle,
      weekTitle,
      weekSubjects,
      weekTasks,
      previousCompletedCount,
      previousSkippedCount,
      diagnosticResult,
      miniTestResults,
      planDate,
      generalPlan,
      roadmap,
      dailyHistory,
    } = parsed.data

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    const targetDate = planDate ?? new Date().toISOString().slice(0, 10)

    if (session && user) {
      const existing = await findDailyPlan(supabase, user.id, goalId, targetDate)

      if (existing) {
        const row = existing.planRow
        return NextResponse.json({
          status: "success",
          data: {
            dayPlan: {
              date: String(row.plan_date),
              weekId: String(row.week_id),
              tasks: existing.tasks,
              dailyPlanId: row.id,
              roadmapId: String(row.roadmap_id),
              goalId: String(row.goal_id),
              weekNumber: Number(row.week_number ?? 1),
              title: String(row.title ?? ""),
              completedTaskIds: Array.isArray(row.completed_task_ids)
                ? row.completed_task_ids
                : typeof row.completed_task_ids === "string"
                  ? JSON.parse(row.completed_task_ids as string)
                  : [],
              skippedTaskIds: Array.isArray(row.skipped_task_ids)
                ? row.skipped_task_ids
                : typeof row.skipped_task_ids === "string"
                  ? JSON.parse(row.skipped_task_ids as string)
                  : [],
              previousDate: typeof row.previous_date === "string" ? row.previous_date : undefined,
              nextDate: typeof row.next_date === "string" ? row.next_date : undefined,
              completedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : undefined,
              stats: typeof row.stats === "object" && row.stats !== null ? row.stats as Record<string, unknown> : null,
            },
            dailyPlanId: row.id,
            goalId,
            roadmapId,
            planId: planId ?? null,
            reused: true,
          },
        })
      }
    }

    const dayPlan = await generateDailyPlan({
      goalId,
      roadmapId,
      planId,
      weekId,
      nctCode,
      nctTitle,
      weekTitle,
      weekSubjects,
      weekTasks,
      planDate: targetDate,
      previousCompletedCount,
      previousSkippedCount,
      diagnosticResult: diagnosticResult as CoachDiagnosticResult | null | undefined,
      miniTestResults: miniTestResults ?? undefined,
      generalPlan: generalPlan as DevelopmentPlan | null | undefined,
      roadmap: roadmap as CoachRoadmap | null | undefined,
      dailyHistory: dailyHistory as DailyPlanRecord[] | null | undefined,
    })

    if (session && user) {
      const generationContext = {
        goalId,
        roadmapId,
        planId: planId ?? null,
        weekId,
        nctCode,
        nctTitle,
        weekTitle,
        planDate: targetDate,
        hasGeneralPlan: !!generalPlan,
        hasDiagnostic: !!diagnosticResult,
        hasHistory: !!(dailyHistory as DailyPlanRecord[] | null)?.length,
      }

      const dayBasePayload: Record<string, unknown> = {
        user_id: user.id,
        session_id: null,
        goal_id: goalId,
        roadmap_id: roadmapId,
        plan_id: planId ?? null,
        plan_date: targetDate,
        week_id: weekId,
        week_number: Number(weekId.replace(/\D+/g, "")) || 1,
        title: weekTitle,
        previous_date: previousDateFor(targetDate),
        completed_task_ids: [],
        skipped_task_ids: [],
        summary: null,
      }

      const { data: insertedDay, error: dayError } = await supabase
        .from("daily_plans")
        .insert(dayBasePayload)
        .select("id")
        .single()

      if (dayError) {
        return NextResponse.json({ status: "error", error: dayError.message, data: null }, { status: 500 })
      }

      try {
        await supabase
          .from("daily_plans")
          .update({ generation_context: generationContext })
          .eq("id", insertedDay.id)
      } catch {} // column may not exist before migration 015

      const taskRows = dayPlan.tasks.map((task, index) => ({
        user_id: user.id,
        session_id: null,
        daily_plan_id: insertedDay.id,
        task_id: task.id,
        title: task.title,
        type: task.type,
        description: task.description,
        duration_minutes: task.duration ?? null,
        position: index,
        status: "pending",
        completed: false,
      }))

      const { error: taskError } = await supabase.from("daily_tasks").insert(taskRows)
      if (taskError) {
        return NextResponse.json({ status: "error", error: taskError.message, data: null }, { status: 500 })
      }

      return NextResponse.json({
        status: "success",
        data: {
          dayPlan: {
            ...dayPlan,
            dailyPlanId: insertedDay.id,
            roadmapId,
            goalId,
            previousDate: previousDateFor(targetDate),
          },
          dailyPlanId: insertedDay.id,
          goalId,
          roadmapId,
          planId: planId ?? null,
          reused: false,
        },
      })
    }

    return NextResponse.json({
      status: "success",
      data: {
        dayPlan,
        goalId,
        roadmapId,
        planId: planId ?? null,
        reused: false,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/daily-plan] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const planDate = searchParams.get("planDate") ?? new Date().toISOString().slice(0, 10)
    const goalId = searchParams.get("goalId")

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!session || !user) {
      return NextResponse.json({ status: "error", error: "Not authenticated", data: null }, { status: 401 })
    }

    if (!goalId) {
      return NextResponse.json({ status: "error", error: "goalId is required", data: null }, { status: 400 })
    }

    const existing = await findDailyPlan(supabase, user.id, goalId, planDate)

    if (!existing) {
      return NextResponse.json({ status: "success", data: { dayPlan: null } })
    }

    const row = existing.planRow

    return NextResponse.json({
      status: "success",
      data: {
        dayPlan: {
          date: String(row.plan_date),
          weekId: String(row.week_id),
          tasks: existing.tasks,
          dailyPlanId: row.id,
          roadmapId: String(row.roadmap_id),
          goalId: String(row.goal_id),
          weekNumber: Number(row.week_number ?? 1),
          title: String(row.title ?? ""),
          completedTaskIds: Array.isArray(row.completed_task_ids)
            ? row.completed_task_ids
            : typeof row.completed_task_ids === "string"
              ? JSON.parse(row.completed_task_ids as string)
              : [],
          skippedTaskIds: Array.isArray(row.skipped_task_ids)
            ? row.skipped_task_ids
            : typeof row.skipped_task_ids === "string"
              ? JSON.parse(row.skipped_task_ids as string)
              : [],
          previousDate: typeof row.previous_date === "string" ? row.previous_date : undefined,
          nextDate: typeof row.next_date === "string" ? row.next_date : undefined,
          completedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : undefined,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/daily-plan] GET error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}

function previousDateFor(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}
