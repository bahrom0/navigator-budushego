import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, SkillAssessment } from "@/types/plan"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт по планированию карьеры. Улучшай планы развития на основе результатов теста. Отвечай только валидный JSON без markdown.",
}

export interface RegeneratePlanOptions {
  previousPlan: DevelopmentPlan
  assessment: SkillAssessment
  testMessage: string
}

export async function regeneratePlan(options: RegeneratePlanOptions): Promise<DevelopmentPlan | null> {
  const { previousPlan, assessment, testMessage } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${previousPlan.nctTitle} (код ${previousPlan.nctCode})`,
      `Предыдущий уровень: ${assessment.level}`,
      "",
      "Предыдущий план не подошёл пользователю.",
      "Причина:",
      testMessage,
      "",
      "Сгенерируй НОВЫЙ план развития из 3–5 этапов с изменённым подходом.",
      "Учти ошибки пользователя и сделай план более практичным и понятным.",
      "",
      "Каждый этап должен содержать:",
      "- title: название",
      "- description: описание",
      "- skills: массив навыков",
      "- recommendations: массив конкретных действий",
      "",
      "Также добавь 2–3 general goals.",
      "",
      "Ответь JSON строго по схеме:",
      "{",
      `  "nctCode": "${previousPlan.nctCode}",`,
      `  "nctTitle": "${previousPlan.nctTitle}",`,
      `  "level": "${previousPlan.level}",`,
      '  "goals": [{"title": "...", "description": "..."}],',
      '  "stages": [{"id":"s1","title":"...","description":"...","skills":["..."],"recommendations":["..."]}]',
      "}",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.5,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
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
    nctCode: typeof parsed.nctCode === "string" ? parsed.nctCode : previousPlan.nctCode,
    nctTitle: typeof parsed.nctTitle === "string" ? parsed.nctTitle : previousPlan.nctTitle,
    level: ["beginner", "intermediate", "advanced"].includes(parsed.level as string)
      ? (parsed.level as SkillAssessment["level"])
      : assessment.level,
    goals,
    stages,
  }
}
