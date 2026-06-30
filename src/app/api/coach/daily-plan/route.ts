import { NextResponse } from "next/server"
import { z } from "zod"
import { generateDailyPlan } from "@/lib/ai/coach-daily-plan"
import type { CoachDiagnosticResult } from "@/types/coach"

export const dynamic = "force-dynamic"

const WeekTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["study", "practice", "review", "test"]),
  description: z.string(),
})

const DailyPlanRequestSchema = z.object({
  goalId: z.string().min(1, "Укажите ID цели"),
  weekId: z.string().min(1, "Укажите ID недели"),
  nctCode: z.string().trim().min(1, "Укажите код НЦТ").max(20),
  nctTitle: z.string().trim().min(1, "Укажите название").max(200),
  weekTitle: z.string().trim().min(1, "Укажите название недели").max(200),
  weekSubjects: z.array(z.string()).min(1, "Укажите предметы недели"),
  weekTasks: z.array(WeekTaskSchema).default([]),
  previousCompletedCount: z.number().int().min(0).optional(),
  previousSkippedCount: z.number().int().min(0).optional(),
  diagnosticResult: z.any().optional(),
})

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
      weekId,
      nctCode,
      nctTitle,
      weekTitle,
      weekSubjects,
      weekTasks,
      previousCompletedCount,
      previousSkippedCount,
      diagnosticResult,
    } = parsed.data

    const dayPlan = await generateDailyPlan({
      goalId,
      weekId,
      nctCode,
      nctTitle,
      weekTitle,
      weekSubjects,
      weekTasks,
      previousCompletedCount,
      previousSkippedCount,
      diagnosticResult:
        diagnosticResult as CoachDiagnosticResult | null | undefined,
    })

    return NextResponse.json({
      status: "success",
      data: { dayPlan },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/daily-plan] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
