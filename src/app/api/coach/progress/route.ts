import { NextResponse } from "next/server"
import { z } from "zod"
import type { CoachProgress } from "@/types/coach"

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
  dayPlanId: z.string().min(1, "Укажите ID плана"),
  taskId: z.string().min(1, "Укажите ID задачи"),
  completed: z.boolean(),
  currentProgress: CoachProgressSchema,
})

const DayCompleteSchema = z.object({
  dayPlanId: z.string().min(1, "Укажите ID плана"),
  completedAt: z.number().int().positive(),
  currentProgress: CoachProgressSchema,
})

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
          error: parsed.error.issues[0]?.message ?? "Некорректные данные",
          data: null,
        },
        { status: 400 },
      )
    }

    const { completed, currentProgress } = parsed.data
    const tasksDelta = completed ? 1 : -1
    const newCompleted = Math.max(
      0,
      currentProgress.totalTasksCompleted + tasksDelta,
    )

    const updated: CoachProgress = {
      ...updateStreak(currentProgress),
      totalTasksCompleted: newCompleted,
      roadmapCompletionPercent: currentProgress.totalTasksPlanned > 0
        ? Math.round(
            (newCompleted / currentProgress.totalTasksPlanned) * 100,
          )
        : 0,
    }

    return NextResponse.json({ status: "success", data: { progress: updated } })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
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
          error: parsed.error.issues[0]?.message ?? "Некорректные данные",
          data: null,
        },
        { status: 400 },
      )
    }

    const { currentProgress } = parsed.data

    const updated: CoachProgress = {
      ...updateStreak(currentProgress),
      totalDaysActive: currentProgress.totalDaysActive + 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    }

    return NextResponse.json({ status: "success", data: { progress: updated } })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/progress] PATCH error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
