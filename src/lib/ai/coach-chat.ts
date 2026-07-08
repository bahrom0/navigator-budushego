import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import { buildCoachContext } from "@/lib/ai/coach-context"
import type { CoachGoal, CoachRoadmap, CoachDayPlan, CoachDiagnosticResult, CoachMiniTestResult, CoachProgress } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"

const MiniTestQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  correctIndex: z.number().optional(),
  correct_answer: z.string().optional(),
})

export const CoachChatResponseSchema = z.object({
  reply: z.string(),
  type: z.enum(["text", "task_reminder", "encouragement", "progress_update", "mini_test"]).optional(),
  subject: z.string().optional(),
  questions: z.array(MiniTestQuestionSchema).optional(),
})

export type CoachChatResponse = z.infer<typeof CoachChatResponseSchema>

function formatMiniTest(
  subject?: string,
  topic?: string,
  questions?: Array<{ question?: string; options?: string[] }>,
): string {
  const label = subject || topic || ""
  const lines: string[] = [`Мини-тест${label ? ` по теме ${label}` : ""}:`]
  if (questions) {
    questions.forEach((q, i) => {
      lines.push(`\n${i + 1}. ${q.question ?? ""}`)
      if (Array.isArray(q.options)) {
        q.options.forEach((opt, j) => {
          lines.push(`   ${String.fromCharCode(97 + j)}) ${opt}`)
        })
      }
    })
  }
  return lines.join("\n")
}

export async function chatWithCoach(
  message: string,
  history?: { role: "user" | "assistant"; content: string }[],
  context?: {
    goal?: CoachGoal | null
    plan?: DevelopmentPlan | null
    roadmap?: CoachRoadmap | null
    dayPlan?: CoachDayPlan | null
    dailyHistory?: DailyPlanRecord[] | null
    diagnostics?: CoachDiagnosticResult | null
    miniTests?: CoachMiniTestResult[] | null
    progress?: CoachProgress | null
  },
): Promise<CoachChatResponse> {
  const systemPrompt = buildCoachContext({
    goal: context?.goal,
    plan: context?.plan,
    roadmap: context?.roadmap,
    dayPlan: context?.dayPlan,
    dailyHistory: context?.dailyHistory,
    diagnostics: context?.diagnostics,
    miniTests: context?.miniTests,
    progress: context?.progress,
  })

  const messages: DeepSeekMessage[] = [systemPrompt]
  if (history) {
    for (const h of history) {
      messages.push({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })
    }
  }
  messages.push({ role: "user", content: message })

  const raw = await deepseekChat(messages, {
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 4096,
    responseFormat: { type: "json_object" },
  })

  if (!raw || !raw.trim()) {
    console.error("[coach-chat] AI returned empty response")
    throw new Error("AI response missing text content")
  }

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsedResponse: Record<string, unknown>
  try {
    parsedResponse = JSON.parse(cleaned)
  } catch {
    console.error("[coach-chat] Failed to parse AI response:", raw.slice(0, 300))
    throw new Error("Failed to parse coach chat response JSON")
  }

  let responseType =
    typeof parsedResponse.type === "string"
      ? parsedResponse.type
      : Array.isArray(parsedResponse.questions) || "mini_test" in parsedResponse
        ? "mini_test"
        : "text"

  let replyText =
    typeof parsedResponse.reply === "string" && parsedResponse.reply.trim()
      ? parsedResponse.reply
      : typeof parsedResponse.message === "string" && parsedResponse.message.trim()
        ? parsedResponse.message
        : typeof parsedResponse.text === "string" && parsedResponse.text.trim()
          ? parsedResponse.text
          : typeof parsedResponse.response === "string" && parsedResponse.response.trim()
            ? parsedResponse.response
            : typeof parsedResponse.content === "string" && parsedResponse.content.trim()
              ? parsedResponse.content
              : typeof parsedResponse.answer === "string" && parsedResponse.answer.trim()
                ? parsedResponse.answer
                : ""

  if (!replyText && responseType === "mini_test" && Array.isArray(parsedResponse.questions)) {
    replyText = formatMiniTest(
      parsedResponse.subject as string | undefined,
      undefined,
      parsedResponse.questions as Array<{ question?: string; options?: string[] }>,
    )
  }

  if (!replyText) {
    const nested = Object.values(parsedResponse).find(
      (value): value is Record<string, unknown> =>
        value !== null
        && typeof value === "object"
        && !Array.isArray(value)
        && Array.isArray((value as { questions?: unknown }).questions),
    )

    if (nested) {
      const questions = nested.questions as Array<{ question?: string; options?: string[] }>
      replyText = formatMiniTest(
        nested.subject as string | undefined,
        nested.topic as string | undefined,
        questions,
      )
      responseType = "mini_test"
      if (typeof nested.subject === "string") {
        parsedResponse.subject = nested.subject
      }
      parsedResponse.questions = questions
    }
  }

  if (!replyText) {
    console.error("[coach-chat] AI returned unexpected JSON:", JSON.stringify(parsedResponse).slice(0, 300))
    throw new Error("AI response missing text content")
  }

  const validated = CoachChatResponseSchema.safeParse({
    reply: replyText,
    type: responseType === "mini_test" ? "mini_test" : (typeof parsedResponse.type === "string" ? parsedResponse.type : "text"),
    subject: responseType === "mini_test" ? (parsedResponse.subject as string | undefined) : undefined,
    questions: responseType === "mini_test" ? (parsedResponse.questions as z.infer<typeof MiniTestQuestionSchema>[]) : undefined,
  })

  if (!validated.success) {
    throw new Error(`Coach chat response validation failed: ${validated.error.issues[0]?.message}`)
  }

  return {
    reply: validated.data.reply,
    type: validated.data.type ?? "text",
    subject: validated.data.subject,
    questions: validated.data.questions,
  }
}
