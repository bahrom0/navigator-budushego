import { NextResponse } from "next/server"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import { generateInterviewQuestions } from "@/lib/ai/generate-interview"
import { InterviewStartSchema, type InterviewStartRequest } from "@/types/api/interview"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный ассистент. Задавай пошагово вопросы, чтобы оценить уровень и интересы абитуриента. Отвечай только валидный JSON без markdown.",
}

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = InterviewStartSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { nctCode, nctTitle, userInterests }: InterviewStartRequest = parsed.data

    const questions = await generateInterviewQuestions({
      nctCode,
      nctTitle,
      userInterests: userInterests ?? [],
      count: 5,
    })

    if (questions.length === 0) {
      return NextResponse.json(
        { status: "error", error: "Не удалось сгенерировать вопросы", data: null },
        { status: 500 },
      )
    }

    return NextResponse.json({ status: "success", data: { questions } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
