import { NextResponse } from "next/server"
import { evaluateAndGetNextQuestion } from "@/lib/ai/generate-interview"
import { InterviewAnswerSchema } from "@/types/api/interview"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = InterviewAnswerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { nctCode, question, answer, previousAnswers, questionIndex, nctTitle = "" } = parsed.data

    const totalQuestions = 5
    const result = await evaluateAndGetNextQuestion({
      nctCode,
      nctTitle,
      question,
      answer,
      previousQA: previousAnswers,
      questionIndex,
      totalQuestions,
    })

    return NextResponse.json({
      status: "success",
      data: {
        nextQuestion: result.nextQuestion,
        isComplete: result.isComplete,
        summary: result.summary,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
