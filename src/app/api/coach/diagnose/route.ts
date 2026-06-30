import { NextResponse } from "next/server"
import { z } from "zod"
import { generateDiagnosticQuestions } from "@/lib/ai/coach-diagnostic"

export const dynamic = "force-dynamic"

const DiagnoseRequestSchema = z.object({
  nctCode: z
    .string()
    .trim()
    .min(1, "Укажите код НЦТ")
    .max(20, "Слишком длинный код НЦТ"),
  nctTitle: z
    .string()
    .trim()
    .min(1, "Укажите название специальности")
    .max(200, "Слишком длинное название"),
  questionCount: z
    .number()
    .int()
    .min(4)
    .max(20)
    .optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = DiagnoseRequestSchema.safeParse(body)

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

    const { nctCode, nctTitle, questionCount } = parsed.data

    const questions = await generateDiagnosticQuestions({
      nctCode,
      nctTitle,
      questionCount,
    })

    return NextResponse.json({
      status: "success",
      data: { questions },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/diagnose] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
