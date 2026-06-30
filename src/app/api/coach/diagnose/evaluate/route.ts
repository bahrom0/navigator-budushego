import { NextResponse } from "next/server"
import { z } from "zod"
import { evaluateDiagnostic } from "@/lib/ai/coach-diagnostic-evaluate"

export const dynamic = "force-dynamic"

const EvaluateRequestSchema = z.object({
  nctCode: z.string().trim().min(1, "Укажите код НЦТ").max(20),
  nctTitle: z.string().trim().min(1, "Укажите название специальности").max(200),
  goalId: z.string().trim().min(1, "Укажите ID цели"),
  questions: z
    .array(
      z.object({
        id: z.string(),
        subject: z.string(),
        question: z.string(),
        options: z.array(z.string()).min(2).max(6),
        correctIndex: z.number().int().min(0),
        explanation: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
      }),
    )
    .min(1, "Добавьте хотя бы один вопрос"),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        selectedIndex: z.number().int().min(0).nullable(),
      }),
    )
    .min(1, "Добавьте хотя бы один ответ"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = EvaluateRequestSchema.safeParse(body)

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

    const { nctCode, nctTitle, goalId, questions, answers } = parsed.data

    const result = await evaluateDiagnostic(
      { nctCode, nctTitle, questions, answers },
      goalId,
    )

    return NextResponse.json({
      status: "success",
      data: { result },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/diagnose/evaluate] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
