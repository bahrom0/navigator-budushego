import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { CoachProgress } from "@/types/coach"
import { appendProductHistory } from "@/lib/product-history"

export const dynamic = "force-dynamic"

const SubjectLevelSchema = z.object({
  subject: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  score: z.number().min(0).max(100),
})

const CoachProgressSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  totalDaysActive: z.number().int().min(0),
  totalTasksCompleted: z.number().int().min(0),
  totalTasksPlanned: z.number().int().min(0),
  roadmapCompletionPercent: z.number().min(0).max(100),
  lastActiveDate: z.string(),
  subjectLevels: z.array(SubjectLevelSchema).default([]),
})

const TaskToggleSchema = z.object({
  dayPlanId: z.string().min(1, "РЈРєР°Р¶РёС‚Рµ ID РїР»Р°РЅР°"),
  taskId: z.string().min(1, "РЈРєР°Р¶РёС‚Рµ ID Р·Р°РґР°С‡Рё"),
  completed: z.boolean(),
  currentProgress: CoachProgressSchema,
})

const DayCompleteSchema = z.object({
  dayPlanId: z.string().min(1, "РЈРєР°Р¶РёС‚Рµ ID РїР»Р°РЅР°"),
  completedAt: z.number().int().positive(),
  goalId: z.string().min(1).optional(),
  currentProgress: CoachProgressSchema,
})

async function persistTaskToggle(
  dayPlanId: string,
  taskId: string,
  completed: boolean,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const now = new Date().toISOString()

  await supabase
    .from("daily_tasks")
    .update({
      completed,
      status: completed ? "completed" : "pending",
      completed_at: completed ? now : null,
      updated_at: now,
    })
    .eq("task_id", taskId)
    .eq("daily_plan_id", dayPlanId)
    .eq("user_id", user.id)

  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("task_id, completed")
    .eq("daily_plan_id", dayPlanId)
    .eq("user_id", user.id)

  const completedIds = (tasks ?? [])
    .filter((task) => task.completed === true)
    .map((task) => task.task_id)

  await supabase
    .from("daily_plans")
    .update({
      completed_task_ids: completedIds,
      updated_at: now,
    })
    .eq("id", dayPlanId)
    .eq("user_id", user.id)

  if (!completed) {
    return
  }

  const [{ data: taskRow }, { data: dayPlanRow }] = await Promise.all([
    supabase
      .from("daily_tasks")
      .select("title")
      .eq("task_id", taskId)
      .eq("daily_plan_id", dayPlanId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_plans")
      .select("goal_id, plan_date")
      .eq("id", dayPlanId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  await appendProductHistory(supabase, user.id, {
    goalId: typeof dayPlanRow?.goal_id === "string" ? dayPlanRow.goal_id : null,
    entityType: "task",
    action: "coach_task_completed",
    title: typeof taskRow?.title === "string" ? `Завершена задача: ${taskRow.title}` : "Завершена задача Coach",
    summary: typeof dayPlanRow?.plan_date === "string" ? `День ${dayPlanRow.plan_date}` : "Прогресс в Coach",
    metadata: {
      dayPlanId,
      taskId,
      planDate: typeof dayPlanRow?.plan_date === "string" ? dayPlanRow.plan_date : null,
    },
  })
}

function updateStreak(progress: CoachProgress): CoachProgress {
  const today = new Date().toISOString().slice(0, 10)
  const lastActive = progress.lastActiveDate

  let newStreak = progress.currentStreak
  if (lastActive) {
    const lastDate = new Date(lastActive)
    const diffDays = Math.floor(
      (new Date(today).getTime() - lastDate.getTime()) / 86400000,
    )
    if (diffDays === 1) {
      newStreak += 1
    } else if (diffDays > 1) {
      newStreak = 1
    }
  } else {
    newStreak = 1
  }

  return {
    ...progress,
    currentStreak: newStreak,
    longestStreak: Math.max(progress.longestStreak, newStreak),
    lastActiveDate: today,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = TaskToggleSchema.safeParse(body)

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

    const { dayPlanId, taskId, completed, currentProgress } = parsed.data

    await persistTaskToggle(dayPlanId, taskId, completed)

    const tasksDelta = completed ? 1 : -1
    const newCompleted = Math.max(0, currentProgress.totalTasksCompleted + tasksDelta)

    const updated: CoachProgress = {
      ...updateStreak(currentProgress),
      totalTasksCompleted: newCompleted,
      roadmapCompletionPercent: currentProgress.totalTasksPlanned > 0
        ? Math.round((newCompleted / currentProgress.totalTasksPlanned) * 100)
        : 0,
    }

    return NextResponse.json({ status: "success", data: { progress: updated } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/progress] POST error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const parsed = DayCompleteSchema.safeParse(body)

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

    const { currentProgress, dayPlanId, goalId } = parsed.data

    const updated: CoachProgress = {
      ...updateStreak(currentProgress),
      totalDaysActive: currentProgress.totalDaysActive + 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await appendProductHistory(supabase, user.id, {
        goalId: goalId ?? null,
        entityType: "daily_plan",
        entityId: dayPlanId,
        action: "coach_day_completed",
        title: "Завершен учебный день",
        summary: `Серия: ${updated.currentStreak} дн.`,
        metadata: {
          dayPlanId,
          streak: updated.currentStreak,
          totalDaysActive: updated.totalDaysActive,
        },
      })
    }

    return NextResponse.json({ status: "success", data: { progress: updated } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/progress] PATCH error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
