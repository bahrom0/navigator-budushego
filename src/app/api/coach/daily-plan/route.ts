import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateDailyPlan } from "@/lib/ai/coach-daily-plan"
import type { CoachDiagnosticResult, CoachDayTask, CoachRoadmap } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"
import { resolveCoachContext } from "@/lib/coach/persistence"
import { appendProductHistory } from "@/lib/product-history"
import { addDays, getWeekForDate, isDateWithinRoadmap } from "@/lib/coach/daily-plan-schedule"

export const dynamic = "force-dynamic"

const WeekTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["study", "practice", "review", "test"]),
  description: z.string(),
})

const DailyPlanRequestSchema = z.object({
  goalId: z.string().min(1, "РЈРєР°Р¶РёС‚Рµ ID С†РµР»Рё"),
  roadmapId: z.string().min(1, "РЈРєР°Р¶РёС‚Рµ ID roadmap"),
  planId: z.string().min(1).optional(),
  weekId: z.string().min(1, "РЈРєР°Р¶РёС‚Рµ ID РЅРµРґРµР»Рё"),
  nctCode: z.string().trim().min(1, "РЈРєР°Р¶РёС‚Рµ РєРѕРґ РќР¦Рў").max(20),
  nctTitle: z.string().trim().min(1, "РЈРєР°Р¶РёС‚Рµ РЅР°Р·РІР°РЅРёРµ").max(200),
  weekTitle: z.string().trim().min(1, "РЈРєР°Р¶РёС‚Рµ РЅР°Р·РІР°РЅРёРµ РЅРµРґРµР»Рё").max(200),
  weekSubjects: z.array(z.string()).min(1, "РЈРєР°Р¶РёС‚Рµ РїСЂРµРґРјРµС‚С‹ РЅРµРґРµР»Рё"),
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
  } satisfies CoachDayTask
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

function buildDayPlanResponse(row: Record<string, unknown>, tasks: CoachDayTask[]) {
  return {
    date: String(row.plan_date),
    weekId: String(row.week_id),
    tasks,
    dailyPlanId: String(row.id),
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
    generationContext:
      typeof row.generation_context === "object" && row.generation_context !== null
        ? row.generation_context as Record<string, unknown>
        : null,
    isDraft: tasks.length === 0,
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
          error: parsed.error.issues[0]?.message ?? "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РґР°РЅРЅС‹Рµ",
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
    let resolvedGoalId = goalId
    let resolvedPlanId = planId ?? null

    if (session && user) {
      const context = await resolveCoachContext(supabase, user.id, {
        goalId,
        planId: planId ?? null,
        nctCode,
        nctTitle,
      })
      if (context.goal?.id) resolvedGoalId = context.goal.id
      if (context.plan?.id) resolvedPlanId = context.plan.id

      const existing = await findDailyPlan(supabase, user.id, resolvedGoalId, targetDate)
      if (existing && existing.tasks.length > 0) {
        const row = existing.planRow
        return NextResponse.json({
          status: "success",
          data: {
            dayPlan: buildDayPlanResponse(row, existing.tasks),
            dailyPlanId: row.id,
            goalId: resolvedGoalId,
            roadmapId,
            planId: resolvedPlanId,
            reused: true,
          },
        })
      }
    }

    let existingDraft: Awaited<ReturnType<typeof findDailyPlan>> | null = null
    if (session && user) {
      existingDraft = await findDailyPlan(supabase, user.id, resolvedGoalId, targetDate)
    }

    const draftGenerationContext =
      typeof existingDraft?.planRow.generation_context === "object" && existingDraft.planRow.generation_context !== null
        ? existingDraft.planRow.generation_context as Record<string, unknown>
        : null

    const requestedRoadmap = roadmap as CoachRoadmap | null | undefined
    const matchedWeek = requestedRoadmap ? getWeekForDate(requestedRoadmap, targetDate) : null
    const resolvedWeekId =
      matchedWeek?.id
      ?? (typeof draftGenerationContext?.weekId === "string" ? draftGenerationContext.weekId : weekId)
    const resolvedWeekTitle =
      matchedWeek?.title
      ?? (typeof draftGenerationContext?.weekTitle === "string" ? draftGenerationContext.weekTitle : weekTitle)
    const resolvedWeekSubjects = matchedWeek?.subjects
      ?? (
        Array.isArray(draftGenerationContext?.weekSubjects)
          ? draftGenerationContext.weekSubjects.filter((subject): subject is string => typeof subject === "string")
          : weekSubjects
      )
    const resolvedWeekTasks = matchedWeek?.tasks ?? weekTasks
    const resolvedWeekNumber =
      matchedWeek?.number
      ?? (typeof draftGenerationContext?.weekNumber === "number" ? draftGenerationContext.weekNumber : Number(weekId.replace(/\D+/g, "")) || 1)

    const dayPlan = await generateDailyPlan({
      goalId: resolvedGoalId,
      roadmapId,
      planId: resolvedPlanId ?? undefined,
      weekId: resolvedWeekId,
      nctCode,
      nctTitle,
      weekTitle: resolvedWeekTitle,
      weekSubjects: resolvedWeekSubjects,
      weekTasks: resolvedWeekTasks,
      planDate: targetDate,
      previousCompletedCount,
      previousSkippedCount,
      diagnosticResult: diagnosticResult as CoachDiagnosticResult | null | undefined,
      miniTestResults: miniTestResults ?? undefined,
      generalPlan: generalPlan as DevelopmentPlan | null | undefined,
      roadmap: requestedRoadmap,
      dailyHistory: dailyHistory as DailyPlanRecord[] | null | undefined,
      dayContext: draftGenerationContext,
    })

    if (session && user) {
      const generationContext = {
        ...draftGenerationContext,
        goalId: resolvedGoalId,
        roadmapId,
        planId: resolvedPlanId,
        weekId: resolvedWeekId,
        weekNumber: resolvedWeekNumber,
        weekTitle: resolvedWeekTitle,
        weekSubjects: resolvedWeekSubjects,
        nctCode,
        nctTitle,
        planDate: targetDate,
        hasGeneralPlan: !!generalPlan,
        hasDiagnostic: !!diagnosticResult,
        hasHistory: !!(dailyHistory as DailyPlanRecord[] | null)?.length,
        promptSeed: typeof draftGenerationContext?.promptSeed === "string" ? draftGenerationContext.promptSeed : undefined,
      }

      const previousDate =
        typeof existingDraft?.planRow.previous_date === "string"
          ? existingDraft.planRow.previous_date
          : requestedRoadmap && isDateWithinRoadmap(requestedRoadmap, targetDate)
            ? addDays(targetDate, -1)
            : null

      const nextDate =
        typeof existingDraft?.planRow.next_date === "string"
          ? existingDraft.planRow.next_date
          : requestedRoadmap && isDateWithinRoadmap(requestedRoadmap, targetDate)
            ? addDays(targetDate, 1)
            : null

      const dayBasePayload: Record<string, unknown> = {
        user_id: user.id,
        session_id: null,
        goal_id: resolvedGoalId,
        roadmap_id: roadmapId,
        plan_id: resolvedPlanId,
        plan_date: targetDate,
        week_id: resolvedWeekId,
        week_number: resolvedWeekNumber,
        title: resolvedWeekTitle,
        previous_date: previousDate,
        next_date: nextDate,
        completed_task_ids: [],
        skipped_task_ids: [],
        summary: null,
        generation_context: generationContext,
      }

      const existingDraftId = typeof existingDraft?.planRow.id === "string" ? existingDraft.planRow.id : null
      let persistedDayId = existingDraftId

      if (existingDraftId) {
        const { error: updateDayError } = await supabase
          .from("daily_plans")
          .update(dayBasePayload)
          .eq("id", existingDraftId)

        if (updateDayError) {
          return NextResponse.json({ status: "error", error: updateDayError.message, data: null }, { status: 500 })
        }
      } else {
        const { data: insertedDay, error: dayError } = await supabase
          .from("daily_plans")
          .insert(dayBasePayload)
          .select("id")
          .single()

        if (dayError) {
          return NextResponse.json({ status: "error", error: dayError.message, data: null }, { status: 500 })
        }

        persistedDayId = String(insertedDay.id)
      }

      if (!persistedDayId) {
        return NextResponse.json({ status: "error", error: "Failed to persist daily plan", data: null }, { status: 500 })
      }

      await supabase.from("daily_tasks").delete().eq("user_id", user.id).eq("daily_plan_id", persistedDayId)

      const taskRows = dayPlan.tasks.map((task, index) => ({
        user_id: user.id,
        session_id: null,
        daily_plan_id: persistedDayId,
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

      await appendProductHistory(supabase, user.id, {
        goalId: resolvedGoalId,
        entityType: "daily_plan",
        entityId: persistedDayId,
        action: existingDraftId ? "daily_plan_materialized" : "daily_plan_generated",
        title: `РЎРѕР±СЂР°РЅ РїР»Р°РЅ РґРЅСЏ: ${resolvedWeekTitle}`,
        summary: `${dayPlan.tasks.length} Р·Р°РґР°С‡ РЅР° ${targetDate}`,
        metadata: {
          roadmapId,
          planId: resolvedPlanId,
          weekId: resolvedWeekId,
          weekTitle: resolvedWeekTitle,
          weekSubjects: resolvedWeekSubjects,
          taskCount: dayPlan.tasks.length,
          planDate: targetDate,
          fromDraft: !!existingDraftId,
        },
      })

      return NextResponse.json({
        status: "success",
        data: {
          dayPlan: {
            ...dayPlan,
            dailyPlanId: persistedDayId,
            roadmapId,
            goalId: resolvedGoalId,
            weekNumber: resolvedWeekNumber,
            title: resolvedWeekTitle,
            previousDate: typeof previousDate === "string" ? previousDate : undefined,
            nextDate: typeof nextDate === "string" ? nextDate : undefined,
            generationContext,
            isDraft: false,
          },
          dailyPlanId: persistedDayId,
          goalId: resolvedGoalId,
          roadmapId,
          planId: resolvedPlanId,
          reused: !!existingDraftId,
        },
      })
    }

    return NextResponse.json({
      status: "success",
      data: {
        dayPlan,
        goalId: resolvedGoalId,
        roadmapId,
        planId: resolvedPlanId,
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

    return NextResponse.json({
      status: "success",
      data: {
        dayPlan: buildDayPlanResponse(existing.planRow, existing.tasks),
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
