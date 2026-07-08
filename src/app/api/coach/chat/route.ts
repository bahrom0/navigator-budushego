import { NextResponse } from "next/server"
import { z } from "zod"
import { chatWithCoach } from "@/lib/ai/coach-chat"
import type { CoachGoal, CoachRoadmap, CoachDayPlan, CoachDiagnosticResult, CoachMiniTestResult, CoachProgress } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"

export const dynamic = "force-dynamic"

const CoachChatRequestSchema = z.object({
  message: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  goal: z.unknown().optional(),
  plan: z.unknown().optional(),
  roadmap: z.unknown().optional(),
  dayPlan: z.unknown().optional(),
  dailyHistory: z.unknown().optional(),
  diagnostics: z.unknown().optional(),
  miniTests: z.unknown().optional(),
  progress: z.unknown().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CoachChatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { message, history, goal: rawGoal, plan: rawPlan, roadmap: rawRoadmap, dayPlan: rawDayPlan, dailyHistory: rawDailyHistory, diagnostics: rawDiagnostics, miniTests: rawMiniTests, progress: rawProgress } = parsed.data
    const result = await chatWithCoach(message, history, {
      goal: rawGoal as CoachGoal | null | undefined,
      plan: rawPlan as DevelopmentPlan | null | undefined,
      roadmap: rawRoadmap as CoachRoadmap | null | undefined,
      dayPlan: rawDayPlan as CoachDayPlan | null | undefined,
      dailyHistory: rawDailyHistory as DailyPlanRecord[] | null | undefined,
      diagnostics: rawDiagnostics as CoachDiagnosticResult | null | undefined,
      miniTests: rawMiniTests as CoachMiniTestResult[] | null | undefined,
      progress: rawProgress as CoachProgress | null | undefined,
    })

    return NextResponse.json({ status: "success", data: result })
  } catch (error) {
    console.error("[/api/coach/chat] error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    const status = message.includes("Failed to parse") || message.includes("response validation") ? 502 : 500
    return NextResponse.json({ status: "error", error: message, data: null }, { status })
  }
}
