import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { CoachRoadmap, CoachDiagnosticResult } from "@/types/coach"

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
  nctCode: string
  nctTitle: string
  university?: string
  diagnosticResult?: CoachDiagnosticResult | null
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
    "Roadmap состоит из недельных этапов. Каждый этап — ключевые темы и задачи.",
    "Первая неделя active, остальные pending.",
    "Учитывай результаты диагностики: слабые темы требуют больше времени.",
    "Каждая неделя содержит 3-5 задач разных типов: study, practice, review, test.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

export async function generateRoadmap(
  options: GenerateRoadmapOptions,
): Promise<CoachRoadmap> {
  const { goalId, nctCode, nctTitle, university, diagnosticResult } = options

  const diagnosticContext = diagnosticResult
    ? [
        "",
        "=== РЕЗУЛЬТАТЫ ДИАГНОСТИКИ ===",
        ...diagnosticResult.subjects.map(
          (s) => `${s.subject}: ${s.level} (${s.score}%)`,
        ),
        `Сильные стороны: ${diagnosticResult.strengths.join(", ")}`,
        `Слабые стороны: ${diagnosticResult.weaknesses.join(", ")}`,
      ].join("\n")
    : "\n(Диагностика не пройдена. Строй универсальный roadmap.)"

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Цель: ${nctTitle} (код НЦТ: ${nctCode})`,
      university ? `Университет: ${university}` : null,
      diagnosticContext,
      "",
      "Сгенерируй roadmap подготовки на 8-12 недель.",
      "Первая неделя должна иметь статус 'active', остальные 'pending'.",
      "Каждая неделя должна охватывать конкретные предметы и темы.",
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
    throw new Error("Failed to parse roadmap JSON")
  }

  const result = RoadmapResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Roadmap validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  return {
    goalId,
    weeks: result.data.weeks.map((w) => ({
      ...w,
      status: w.status as "pending" | "active" | "completed",
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
