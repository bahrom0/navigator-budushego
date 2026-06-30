import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { CoachRoadmap, CoachDiagnosticResult, RoadmapDurationWeeks } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"

const WeekTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["study", "practice", "review", "test"]),
  description: z.string(),
})

const WeekSchema = z.object({
  id: z.string(),
  number: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
  subjects: z.array(z.string()).min(1),
  tasks: z.array(WeekTaskSchema).min(1),
  status: z.enum(["pending", "active", "completed"]),
})

const RoadmapResponseSchema = z.object({
  weeks: z.array(WeekSchema).min(1),
})

export interface GenerateRoadmapOptions {
  goalId: string
  planId?: string
  nctCode: string
  nctTitle: string
  university?: string
  profession?: string
  city?: string
  durationWeeks?: RoadmapDurationWeeks
  generalPlan?: DevelopmentPlan | null
  diagnosticResult?: CoachDiagnosticResult | null
}

function buildPlanContext(plan?: DevelopmentPlan | null): string {
  if (!plan) return "(Общий план не создан.)"
  const lines: string[] = [
    "=== ОБЩИЙ ПЛАН РАЗВИТИЯ ===",
    `Уровень: ${plan.level}`,
  ]
  if (plan.goals?.length) {
    lines.push("Цели плана:")
    plan.goals.forEach((g) => lines.push(`  - ${g.title}: ${g.description}`))
  }
  if (plan.stages?.length) {
    lines.push("Этапы плана:")
    plan.stages.forEach((s) => {
      lines.push(`  - ${s.title}: ${s.description}`)
      if (s.skills?.length) lines.push(`    Навыки: ${s.skills.join(", ")}`)
      if (s.recommendations?.length) lines.push(`    Рекомендации: ${s.recommendations.join("; ")}`)
    })
  }
  return lines.join("\n")
}

function buildDiagnosticContext(diagnosticResult?: CoachDiagnosticResult | null): string {
  if (!diagnosticResult) return "(Диагностика не пройдена. Строй универсальный roadmap.)"
  const lines: string[] = [
    "=== РЕЗУЛЬТАТЫ ДИАГНОСТИКИ ===",
    ...diagnosticResult.subjects.map((s) => `${s.subject}: ${s.level} (${s.score}%)`),
  ]
  if (diagnosticResult.strengths.length) lines.push(`Сильные стороны: ${diagnosticResult.strengths.join(", ")}`)
  if (diagnosticResult.weaknesses.length) lines.push(`Слабые стороны: ${diagnosticResult.weaknesses.join(", ")}`)
  if (diagnosticResult.recommendations.length) lines.push(`Рекомендации: ${diagnosticResult.recommendations.join("; ")}`)
  return lines.join("\n")
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты — эксперт по подготовке к поступлению в Казахстане.",
    "Строишь долгосрочный маршрут подготовки (Roadmap) для абитуриента.",
    "Roadmap состоит из недельных этапов.",
    "Первая неделя active, остальные pending.",
    "Учитывай общий план развития как главный ориентир.",
    "Учитывай результаты диагностики: слабые темы требуют больше времени.",
    "Каждая неделя содержит 3-5 задач разных типов: study, practice, review, test.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

export async function generateRoadmap(
  options: GenerateRoadmapOptions,
): Promise<CoachRoadmap> {
  const { goalId, planId, nctCode, nctTitle, university, profession, city, durationWeeks, generalPlan, diagnosticResult } = options

  const weeksCount = durationWeeks ?? 12
  const planContext = buildPlanContext(generalPlan)
  const diagContext = buildDiagnosticContext(diagnosticResult)

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Goal ID: ${goalId}`,
      planId ? `Plan ID: ${planId}` : null,
      `Цель: ${nctTitle} (код НЦТ: ${nctCode})`,
      university ? `Университет: ${university}` : null,
      profession ? `Профессия/направление: ${profession}` : null,
      city ? `Город: ${city}` : null,
      "",
      planContext,
      "",
      diagContext,
      "",
      `Сгенерируй roadmap подготовки ровно на ${weeksCount} ${weeksCount === 1 ? "неделю" : weeksCount < 5 ? "недели" : "недель"}.`,
      "ВАЖНО: количество недель в ответе должно строго соответствовать запрошенному количеству.",
      "Первая неделя должна иметь статус 'active', остальные 'pending'.",
      "Каждая неделя должна охватывать конкретные предметы и темы.",
      "Приоритеты: сначала общий план, потом диагностика, потом цель, потом прогресс.",
      "Не игнорируй слабые стороны пользователя из диагностики.",
      "",
      "Ответь JSON строго по схеме:",
      "{",
      '  "weeks": [',
      "    {",
      '      "id": "w1",',
      '      "number": 1,',
      '      "title": "Основы математики",',
      '      "description": "Изучение базовых математических понятий",',
      '      "subjects": ["Математика"],',
      "      \"tasks\": [",
      "        {",
      '          "id": "w1t1",',
      '          "title": "Изучить квадратные уравнения",',
      '          "type": "study",',
      '          "description": "Изучить теорию и решить 10 задач"',
      "        }",
      "      ],",
      '      "status": "active"',
      "    }",
      "  ]",
      "}",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ]
      .filter(Boolean)
      .join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.3,
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
      try {
        parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
      } catch {
        const arrStart = cleaned.indexOf('[')
        const arrEnd = cleaned.lastIndexOf(']')
        if (arrStart !== -1 && arrEnd > arrStart) {
          parsed = JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
        } else {
          console.error("[coach-roadmap] Failed to parse:", raw.slice(0, 200))
          throw new Error("Failed to parse roadmap JSON")
        }
      }
    } else {
      console.error("[coach-roadmap] No JSON object found:", raw.slice(0, 200))
      throw new Error("Failed to parse roadmap JSON")
    }
  }

  const result = RoadmapResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Roadmap validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  const normalizedWeeks = result.data.weeks.slice(0, weeksCount).map((w, index) => ({
    ...w,
    number: index + 1,
    status: index === 0 ? "active" : w.status,
  }))

  while (normalizedWeeks.length < weeksCount) {
    const index = normalizedWeeks.length + 1
    normalizedWeeks.push({
      id: `w${index}`,
      number: index,
      title: `Неделя ${index}`,
      description: "Уточнение и закрепление темы недели.",
      subjects: [nctTitle],
      tasks: [
        {
          id: `w${index}t1`,
          title: "Закрепить базовые темы",
          type: "study",
          description: "Повторить ключевые знания по выбранному направлению.",
        },
      ],
      status: index === 1 ? "active" : "pending",
    })
  }

  return {
    id: generateId(),
    goalId,
    weeks: normalizedWeeks.map((w) => ({
      ...w,
      status: w.status as "pending" | "active" | "completed",
    })),
    durationWeeks: weeksCount as RoadmapDurationWeeks,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
