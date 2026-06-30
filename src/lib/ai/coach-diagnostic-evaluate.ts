import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { CoachDiagnosticResult, CoachSubjectLevelName } from "@/types/coach"

const SubjectLevelSchema = z.object({
  subject: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  score: z.number().min(0).max(100),
})

const EvaluateResponseSchema = z.object({
  subjects: z.array(SubjectLevelSchema).min(1),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
})

export interface DiagnosticQuestionInput {
  id: string
  subject: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
}

export interface DiagnosticAnswerInput {
  questionId: string
  selectedIndex: number | null
}

export interface EvaluateDiagnosticOptions {
  nctCode: string
  nctTitle: string
  questions: DiagnosticQuestionInput[]
  answers: DiagnosticAnswerInput[]
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты — эксперт по оценке знаний абитуриентов Казахстана.",
    "Оцениваешь результаты диагностики по выбранной специальности.",
    "Определяешь уровень по каждому предмету, сильные и слабые стороны.",
    "Даёшь рекомендации по фокусу подготовки.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function evaluateDiagnostic(
  options: EvaluateDiagnosticOptions,
  goalId: string,
): Promise<CoachDiagnosticResult> {
  const { nctCode, nctTitle, questions, answers } = options

  const questionsText = questions
    .map(
      (q) =>
        `Вопрос ${q.id} (${q.subject}, ${q.difficulty}): ${q.question}\n` +
        `Варианты: ${q.options.map((o, i) => `${i}. ${o}`).join(", ")}\n` +
        `Правильный ответ: ${q.correctIndex}\n` +
        `Объяснение: ${q.explanation}`,
    )
    .join("\n\n")

  const answersText = answers
    .map((a) => {
      const question = questions.find((q) => q.id === a.questionId)
      const isCorrect = question ? a.selectedIndex === question.correctIndex : false
      const skipped = a.selectedIndex === null
      return (
        `Вопрос ${a.questionId}: выбран ${a.selectedIndex ?? "пропущен"}, ` +
        `правильный ${question?.correctIndex}, ` +
        `${skipped ? "пропущен" : isCorrect ? "верно" : "неверно"}`
      )
    })
    .join("\n")

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Специальность: ${nctTitle} (код НЦТ: ${nctCode})`,
      "",
      "Вопросы диагностики:",
      questionsText,
      "",
      "Ответы пользователя:",
      answersText,
      "",
      "Оцени результаты диагностики и верни JSON строго по схеме:",
      "{",
      '  "subjects": [',
      "    {",
      '      "subject": "Название предмета",',
      '      "level": "beginner | intermediate | advanced",',
      '      "score": 0-100',
      "    }",
      "  ],",
      '  "strengths": ["Сильная сторона 1", "Сильная сторона 2"],',
      '  "weaknesses": ["Слабая сторона 1", "Слабая сторона 2"],',
      '  "recommendations": ["Рекомендация 1", "Рекомендация 2"]',
      "}",
      "",
      "Уровни: beginner (0-40), intermediate (41-70), advanced (71-100).",
      "score — процент правильных ответов по предмету.",
      "Сильные стороны — предметы/темы с лучшими результатами.",
      "Слабые стороны — предметы/темы, требующие внимания.",
      "Рекомендации — конкретные советы по фокусу подготовки.",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) }
      catch { throw new Error("Failed to parse diagnostic evaluation JSON") }
    } else { throw new Error("Failed to parse diagnostic evaluation JSON") }
  }

  const result = EvaluateResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Diagnostic evaluation validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  return {
    id: generateId(),
    goalId,
    subjects: result.data.subjects.map((s) => ({
      subject: s.subject,
      level: s.level as CoachSubjectLevelName,
      score: s.score,
    })),
    strengths: result.data.strengths,
    weaknesses: result.data.weaknesses,
    recommendations: result.data.recommendations,
    takenAt: Date.now(),
  }
}
