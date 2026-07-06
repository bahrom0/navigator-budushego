import { NextResponse } from "next/server"
import { z } from "zod"
import { deepseekChat } from "@/lib/ai/deepseek"
import { buildTeacherContext } from "@/lib/ai/teacher-context"
import { TeacherChatResponseSchema } from "@/types/teacher"
import type { ProfileData, PlanRecord } from "@/types/profile"
import type { TeacherBundleContext, TeacherEntryContext } from "@/types/teacher"

export const dynamic = "force-dynamic"

const TeacherChatSchema = z.object({
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
  profile: z.unknown(),
  activePlan: z.unknown().optional(),
  bundleContext: z
    .object({
      goalCode: z.string().optional(),
      goalTitle: z.string().optional(),
      university: z.string().optional(),
      city: z.string().optional(),
      planLevel: z.string().optional(),
      planStageTitles: z.array(z.string()).optional(),
      currentWeekNumber: z.number().optional(),
      currentWeekTitle: z.string().optional(),
      currentWeekSubjects: z.array(z.string()).optional(),
      todayPlanDate: z.string().optional(),
      todayTaskTitles: z.array(z.string()).optional(),
    })
    .optional(),
  context: z
    .object({
      source: z.enum(["teacher_home", "plan", "coach_today", "coach_task", "coach_roadmap"]).optional(),
      topic: z.string().optional(),
      question: z.string().optional(),
      stageTitle: z.string().optional(),
      taskTitle: z.string().optional(),
      taskType: z.string().optional(),
      weekTitle: z.string().optional(),
      weekNumber: z.number().optional(),
    })
    .optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = TeacherChatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { message, history = [], profile: rawProfile, activePlan: rawPlan, bundleContext: rawBundleContext, context } = parsed.data
    const profile = rawProfile as ProfileData
    const activePlan = rawPlan ? (rawPlan as PlanRecord) : null
    const bundleContext = rawBundleContext ? (rawBundleContext as TeacherBundleContext) : null
    const entryContext = (context ?? null) as TeacherEntryContext | null

    const systemMessages = buildTeacherContext({
      profile,
      activePlan,
      bundleContext,
      context: entryContext,
    })

    const userMessages = history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }))

    const allMessages = [
      ...systemMessages,
      ...userMessages,
      { role: "user" as const, content: message },
    ]

    const raw = await deepseekChat(allMessages, {
      model: "deepseek-chat",
      temperature: 0.3,
      maxTokens: 2048,
      responseFormat: { type: "json_object" },
    })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

    if (!cleaned) {
      return NextResponse.json(
        { status: "error", error: "AI returned empty response", data: null },
        { status: 502 },
      )
    }

    let parsedResponse: Record<string, unknown>
    try {
      parsedResponse = JSON.parse(cleaned)
    } catch (parseError) {
      return NextResponse.json(
        {
          status: "error",
          error: `AI returned invalid JSON: ${cleaned.slice(0, 100)}`,
          data: null,
        },
        { status: 502 },
      )
    }

    const replyText =
      typeof parsedResponse.reply === "string" && parsedResponse.reply.trim()
        ? parsedResponse.reply
        : typeof parsedResponse.message === "string" && parsedResponse.message.trim()
          ? parsedResponse.message
          : typeof parsedResponse.text === "string" && parsedResponse.text.trim()
            ? parsedResponse.text
            : ""

    if (!replyText) {
      return NextResponse.json(
        { status: "error", error: "AI response missing text content", data: null },
        { status: 502 },
      )
    }

    const validated = TeacherChatResponseSchema.safeParse({
      reply: replyText,
      type: parsedResponse.type ?? "text",
    })

    if (!validated.success) {
      return NextResponse.json(
        { status: "error", error: validated.error.message, data: null },
        { status: 502 },
      )
    }

    return NextResponse.json({ status: "success", data: validated.data })
  } catch (error) {
    console.error("[/api/teacher/chat] error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
