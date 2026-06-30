import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, PlanTestQuestion } from "@/types/plan"
import type { UserLevel } from "@/types/profile"

export interface TestQuestionContext {
  nctCode: string
  nctTitle: string
  level?: UserLevel
  university?: string
  profession?: string
  city?: string
  userInterests?: string[]
  goals?: { title: string; description: string }[]
  stages?: {
    id: string
    title: string
    description: string
    skills: string[]
    recommendations: string[]
  }[]
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты - профориентационный эксперт. Составляй проверочные вопросы по цели поступления. Отвечай только валидный JSON без markdown.",
}

export async function generateTestQuestions(
  context: DevelopmentPlan | TestQuestionContext,
): Promise<PlanTestQuestion[]> {
  const nctCode = context.nctCode
  const nctTitle = context.nctTitle
  const level = "level" in context ? context.level : undefined
  const stages = "stages" in context ? context.stages ?? [] : []
  const goals = "goals" in context ? context.goals ?? [] : []
  const profession = "profession" in context ? context.profession : undefined
  const university = "university" in context ? context.university : undefined
  const city = "city" in context ? context.city : undefined
  const userInterests = "userInterests" in context ? context.userInterests ?? [] : []

  const sections: string[] = [
    `Направление: ${nctTitle} (${nctCode})`,
  ]

  if (level) sections.push(`Уровень пользователя: ${level}`)
  if (university) sections.push(`Университет: ${university}`)
  if (profession) sections.push(`Профессия/направление: ${profession}`)
  if (city) sections.push(`Город: ${city}`)
  if (userInterests.length > 0) sections.push(`Интересы: ${userInterests.join(", ")}`)

  if (goals.length > 0) {
    sections.push("", "Цели:")
    goals.forEach((g) => sections.push(`- ${g.title}: ${g.description}`))
  }

  if (stages.length > 0) {
    sections.push("", "Этапы плана:")
    stages.forEach((s) => {
      sections.push(`- ${s.title}: ${s.description}. Навыки: ${s.skills.join(", ")}. Рекомендации: ${s.recommendations.join("; ")}`)
    })
  }

  sections.push(
    "",
    "Сгенерируй 5 проверочных вопросов для стартовой проверки по цели поступления.",
    "Если план ещё не сформирован, вопросы должны проверять базовое понимание выбранной специальности, профессии и мотивации.",
    "Каждый вопрос должен быть практическим - как бы пользователь применил полученные знания.",
    "",
    'Ответь JSON строго по схеме: { "questions": [{ "id": "q1", "question": "..." }] }',
    "Важно: строго валидный JSON, без markdown.",
  )

  const prompt: DeepSeekMessage = {
    role: "user",
    content: sections.join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.5,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    return questions
      .filter(
        (q: unknown): q is Record<string, unknown> =>
          typeof (q as Record<string, unknown>).id === "string" &&
          typeof (q as Record<string, unknown>).question === "string",
      )
      .map((q: Record<string, unknown>) => ({
        id: q.id as string,
        question: q.question as string,
      }))
  } catch {
    return []
  }
}
