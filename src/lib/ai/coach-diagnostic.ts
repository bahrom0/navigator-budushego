import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"

const DiagnosticQuestionSchema = z.object({
  id: z.string(),
  subject: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
})

const DiagnosticResponseSchema = z.object({
  questions: z.array(DiagnosticQuestionSchema).min(1),
})

export type DiagnosticQuestion = z.infer<typeof DiagnosticQuestionSchema>

export interface GenerateDiagnosticOptions {
  nctCode: string
  nctTitle: string
  questionCount?: number
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты — эксперт по оценке знаний абитуриентов Казахстана.",
    "Генерируешь вопросы диагностики для подготовки к поступлению.",
    "Вопросы должны покрывать предметы, релевантные для специальности.",
    "Разные уровни сложности: easy, medium, hard.",
    "Каждый вопрос имеет один правильный ответ и объяснение.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

export async function generateDiagnosticQuestions(
  options: GenerateDiagnosticOptions,
): Promise<DiagnosticQuestion[]> {
  const { nctCode, nctTitle, questionCount = 12 } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Специальность: ${nctTitle} (код НЦТ: ${nctCode})`,
      `Сгенерируй ${questionCount} вопросов диагностики знаний.`,
      "Вопросы должны покрывать ключевые предметы для этой специальности.",
      "Распредели уровни сложности: 4 easy, 4 medium, 4 hard.",
      "",
      "Ответь JSON строго по схеме:",
      `{`,
      `  "questions": [`,
      `    {`,
      `      "id": "dq1",`,
      `      "subject": "Математика",`,
      `      "question": "Текст вопроса",`,
      `      "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],`,
      `      "correctIndex": 0,`,
      `      "explanation": "Объяснение правильного ответа",`,
      `      "difficulty": "easy"`,
      `    }`,
      `  ]`,
      `}`,
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.4,
    maxTokens: 4096,
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
      catch { throw new Error("Failed to parse diagnostic questions JSON") }
    } else { throw new Error("Failed to parse diagnostic questions JSON") }
  }

  const result = DiagnosticResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Diagnostic questions validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  return result.data.questions
}
