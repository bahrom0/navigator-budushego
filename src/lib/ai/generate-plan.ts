import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, SkillAssessment } from "@/types/plan"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт по планированию карьеры. Генерируй personalised roadmap. Отвечай только валидный JSON без markdown.",
}

export interface GeneratePlanOptions {
  goalId?: string
  nctCode: string
  nctTitle: string
  university?: string
  profession?: string
  city?: string
  userInterests?: string[]
  previousAnswers?: { question: string; answer: string }[]
  diagnosticContext?: {
    source?: "interview" | "plan-test"
    summary?: string
    level?: "beginner" | "intermediate" | "advanced"
    answers?: { question: string; answer: string }[]
  }
  assessment: SkillAssessment
}

export async function generateDevelopmentPlan(options: GeneratePlanOptions): Promise<DevelopmentPlan | null> {
  const {
    goalId,
    nctCode,
    nctTitle,
    university,
    profession,
    city,
    userInterests = [],
    previousAnswers = [],
    diagnosticContext,
    assessment,
  } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      goalId ? `Цель ID: ${goalId}` : null,
      `Направление: ${nctTitle} (код ${nctCode})`,
      university ? `Университет: ${university}` : null,
      profession ? `Профессия/направление: ${profession}` : null,
      city ? `Город: ${city}` : null,
      `Интересы: ${userInterests.join(", ") || "не указаны"}`,
      diagnosticContext?.source ? `Источник диагностики: ${diagnosticContext.source}` : null,
      diagnosticContext?.summary ? `Сводка диагностики: ${diagnosticContext.summary}` : null,
      previousAnswers.length > 0
        ? [
            "Ответы пользователя из диагностики:",
            ...previousAnswers.map((item, index) => `${index + 1}. ${item.question} -> ${item.answer}`),
          ].join("\n")
        : null,
      diagnosticContext?.answers && diagnosticContext.answers.length > 0
        ? [
            "Подробные ответы из окна диагностики:",
            ...diagnosticContext.answers.map((item, index) => `${index + 1}. ${item.question} -> ${item.answer}`),
          ].join("\n")
        : null,
      `Уровень: ${assessment.level}`,
      `Навыки: ${assessment.skills.join(", ") || "не указаны"}`,
      `Сильные стороны: ${assessment.strengths.join(", ") || "не указаны"}`,
      `Зоны роста: ${assessment.gaps.join(", ") || "не указаны"}`,
      "Учитывай, что генерация должна опираться на ответы из диагностики, а не только на код.",
      "Сгенерируй общий план развития для активной цели поступления из 3-5 этапов. Каждый этап должен содержать:",
      "- title: название",
      "- description: описание",
      "- skills: массив навыков для освоения на этом этапе",
      "- recommendations: массив рекомендаций",
      "Также добавь 2-3 general goals.",
      "Ответь JSON строго по схеме:",
      "{",
      `  "nctCode": "${nctCode}",`,
      `  "nctTitle": "${nctTitle}",`,
      `  "level": "${assessment.level}",`,
      '  "goals": [{"title": "...", "description": "..."}],',
      '  "stages": [{"id":"s1","title":"...","description":"...","skills":["..."],"recommendations":["..."]}]',
      "}",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.4,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    console.error("[generate-plan] failed to parse AI response:", err)
    return null
  }

  const goals = Array.isArray(parsed.goals)
    ? parsed.goals
        .filter(
          (g): g is { title: string; description: string } =>
            typeof (g as Record<string, unknown>).title === "string" &&
            typeof (g as Record<string, unknown>).description === "string",
        )
        .map((g) => ({ title: g.title, description: g.description }))
    : []

  const stages = Array.isArray(parsed.stages)
    ? parsed.stages
        .filter(
          (s): s is Record<string, unknown> =>
            typeof (s as Record<string, unknown>).id === "string" &&
            typeof (s as Record<string, unknown>).title === "string" &&
            typeof (s as Record<string, unknown>).description === "string",
        )
        .map((s) => ({
          id: s.id as string,
          title: s.title as string,
          description: s.description as string,
          skills: Array.isArray(s.skills)
            ? s.skills.filter((sk: unknown): sk is string => typeof sk === "string")
            : [],
          recommendations: Array.isArray(s.recommendations)
            ? s.recommendations.filter((r: unknown): r is string => typeof r === "string")
            : [],
        }))
    : []

  if (stages.length === 0) return null

  return {
    nctCode: typeof parsed.nctCode === "string" ? parsed.nctCode : nctCode,
    nctTitle: typeof parsed.nctTitle === "string" ? parsed.nctTitle : nctTitle,
    level: ["beginner", "intermediate", "advanced"].includes(parsed.level as string)
      ? (parsed.level as SkillAssessment["level"])
      : assessment.level,
    goals,
    stages,
  }
}
