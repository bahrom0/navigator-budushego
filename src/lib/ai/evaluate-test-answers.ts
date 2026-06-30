import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, PlanTestAnswer, PlanTestEvaluation } from "@/types/plan"
import type { UserLevel } from "@/types/profile"

export interface TestEvaluationContext {
  nctCode: string
  nctTitle: string
  level?: UserLevel
  university?: string
  profession?: string
  city?: string
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
    "Ты - профориентационный эксперт. Оценивай ответы пользователя по цели поступления. Отвечай только валидный JSON без markdown.",
}

export async function evaluateTestAnswers(
  context: DevelopmentPlan | TestEvaluationContext,
  answers: PlanTestAnswer[],
): Promise<PlanTestEvaluation> {
  const nctCode = context.nctCode
  const nctTitle = context.nctTitle
  const level = "level" in context ? context.level : undefined
  const stages = "stages" in context ? context.stages ?? [] : []
  const goals = "goals" in context ? context.goals ?? [] : []
  const profession = "profession" in context ? context.profession : undefined
  const university = "university" in context ? context.university : undefined
  const city = "city" in context ? context.city : undefined

  const sections: string[] = [`Направление: ${nctTitle} (${nctCode})`]
  if (level) sections.push(`Текущий уровень: ${level}`)
  if (university) sections.push(`Университет: ${university}`)
  if (profession) sections.push(`Профессия/направление: ${profession}`)
  if (city) sections.push(`Город: ${city}`)

  if (goals.length > 0) {
    sections.push("", "Цели:")
    goals.forEach((g) => sections.push(`- ${g.title}: ${g.description}`))
  }

  if (stages.length > 0) {
    sections.push("", "Этапы плана:")
    stages.forEach((s) => sections.push(`- ${s.title}: ${s.description}. Навыки: ${s.skills.join(", ")}`))
  }

  const answersText = answers
    .map((a) => `Вопрос: ${a.question}\nОтвет: ${a.answer}`)
    .join("\n\n")

  sections.push(
    "",
    "Ответы пользователя:",
    answersText,
    "",
    "Оцени ответы. Если пользователь показал достаточное базовое понимание цели поступления, поставь passed=true.",
    "Если passed=true и текущий уровень beginner, установи newLevel='intermediate'.",
    "Если passed=true и текущий уровень intermediate, newLevel='advanced'.",
    "Если passed=false, newLevel не указывай.",
    "",
    'Ответь JSON строго по схеме: { "passed": boolean, "message": "строка с пояснением" }',
    "Если passed=true, добавь newLevel: 'intermediate' или 'advanced'.",
    "Важно: строго валидный JSON, без markdown.",
  )

  const prompt: DeepSeekMessage = {
    role: "user",
    content: sections.join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 1024,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      passed: parsed.passed === true,
      message:
        typeof parsed.message === "string" ? parsed.message : "Результат проверен",
      newLevel:
        ["beginner", "intermediate", "advanced"].includes(parsed.newLevel as string)
          ? (parsed.newLevel as PlanTestEvaluation["newLevel"])
          : undefined,
    }
  } catch {
    return { passed: false, message: "Не удалось оценить ответы" }
  }
}
