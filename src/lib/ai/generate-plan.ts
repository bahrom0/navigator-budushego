import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, SkillAssessment } from "@/types/plan"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт по планированию карьеры. Генерируй personalised roadmap. Отвечай только валидный JSON без markdown.",
}

export interface GeneratePlanOptions {
  nctCode: string
  nctTitle: string
  userInterests?: string[]
  assessment: SkillAssessment
}

export async function generateDevelopmentPlan(options: GeneratePlanOptions): Promise<DevelopmentPlan> {
  const { nctCode, nctTitle, userInterests = [], assessment } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${nctTitle} (код ${nctCode})`,
      `Интересы: ${userInterests.join(", ") || "не указаны"}`,
      `Уровень: ${assessment.level}`,
      `Навыки: ${assessment.skills.join(", ") || "не указаны"}`,
      `Сильные стороны: ${assessment.strengths.join(", ") || "не указаны"}`,
      `Зоны роста: ${assessment.gaps.join(", ") || "не указаны"}`,
      "Сгенерируй план развития из 3–5 этапов. Каждый этап должен содержать:",
      "- title: название",
      "- description: описание",
      "- skills: массив навыков для освоения на этом этапе",
      "- recommendations: массив рекомендаций",
      "Также добавь 2–3 general goals.",
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
  } catch {
    return getFallbackPlan(nctCode, nctTitle, assessment.level)
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

function getFallbackPlan(nctCode: string, nctTitle: string, level: SkillAssessment["level"]): DevelopmentPlan {
  const levelLabel: Record<SkillAssessment["level"], string> = {
    beginner: "начальный",
    intermediate: "средний",
    advanced: "продвинутый",
  }

  return {
    nctCode,
    nctTitle,
    level,
    goals: [
      { title: "Изучить основы", description: "Освоить базовые понятия направления." },
      { title: "Закрепить практикой", description: "Выполнить практические задания для прокачки навыков." },
    ],
    stages: [
      {
        id: "s1",
        title: "Этап 1. Основы",
        description: `Уровень ${levelLabel[level]}. Изучение базовых концепций и терминологии.`,
        skills: ["Базовые знания", "Теория"],
        recommendations: ["Онлайн-курсы", "Учебники и документация"],
      },
      {
        id: "s2",
        title: "Этап 2. Практика",
        description: "Закрепление знаний на практике через проекты и задачи.",
        skills: ["Практические навыки"],
        recommendations: ["Pet-проекты", "Стажировки", "Хактоны"],
      },
    ],
  }
}
