import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type {
  CoachDayPlan,
  CoachDayTask,
  CoachDiagnosticResult,
  CoachMiniTestResult,
  CoachWeekTask,
  CoachRoadmap,
} from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"

const DayTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["study", "practice", "review", "test"]),
  description: z.string(),
  duration: z.number().min(5).max(120).optional(),
})

const DailyPlanResponseSchema = z.object({
  tasks: z.array(DayTaskSchema).min(1).max(8),
})

export interface GenerateDailyPlanOptions {
  goalId: string
  weekId: string
  roadmapId?: string
  planId?: string
  nctCode: string
  nctTitle: string
  weekTitle: string
  weekSubjects: string[]
  weekTasks: CoachWeekTask[]
  planDate?: string
  previousCompletedCount?: number
  previousSkippedCount?: number
  diagnosticResult?: CoachDiagnosticResult | null
  miniTestResults?: CoachMiniTestResult[]
  generalPlan?: DevelopmentPlan | null
  roadmap?: CoachRoadmap | null
  dailyHistory?: DailyPlanRecord[] | null
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
    lines.push("Этапы:")
    plan.stages.forEach((s) => {
      lines.push(`  - ${s.title}: ${s.description}`)
      if (s.recommendations?.length) lines.push(`    Рекомендации: ${s.recommendations.join("; ")}`)
    })
  }
  return lines.join("\n")
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты — персональный наставник по подготовке к поступлению в Казахстане.",
    "Генерируешь план на день для абитуриента.",
    "План содержит 4-6 задач разных типов: study, practice, review, test.",
    "Каждая задача имеет длительность в минутах (5-120).",
    "Учитывай общий план развития как главный ориентир.",
    "Учитывай результаты диагностики: слабые темы требуют больше внимания.",
    "Учитывай roadmap: каждая задача дня должна быть шагом к выполнению недельных задач.",
    "Учитывай прогресс: если опережает — усложняй, если отстаёт — упрощай.",
    "Если пропущено много задач — снизь нагрузку, верни к слабым темам.",
    "Учитывай историю предыдущих дней: не повторяй уже выполненные задачи, развивай пройденное.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

export async function generateDailyPlan(
  options: GenerateDailyPlanOptions,
): Promise<CoachDayPlan> {
  const {
    goalId,
    weekId,
    roadmapId,
    planId,
    nctCode,
    nctTitle,
    weekTitle,
    weekSubjects,
    weekTasks,
    planDate,
    previousCompletedCount,
    previousSkippedCount,
    diagnosticResult,
    miniTestResults,
    generalPlan,
    roadmap,
    dailyHistory,
  } = options

  const planContext = buildPlanContext(generalPlan)

  const diagnosticContext = diagnosticResult
    ? [
        "=== ДИАГНОСТИКА ===",
        ...diagnosticResult.subjects.map(
          (s) => `${s.subject}: ${s.level} (${s.score}%)`,
        ),
        `Слабые: ${diagnosticResult.weaknesses.join(", ")}`,
        `Сильные: ${diagnosticResult.strengths.join(", ")}`,
      ].join("\n")
    : "(Диагностика не пройдена.)"

  const miniTestContext = miniTestResults?.length
    ? [
        "",
        "=== МИНИ-ТЕСТЫ ===",
        ...miniTestResults.map(
          (m) => `${m.subject}: ${m.correctAnswers}/${m.totalQuestions} правильных`,
        ),
      ].join("\n")
    : ""

  const adaptation = buildAdaptationHint(
    previousCompletedCount ?? 0,
    previousSkippedCount ?? 0,
    miniTestResults,
  )

  const weekTasksContext = weekTasks.length > 0
    ? [
        "",
        "=== ЗАДАЧИ НЕДЕЛИ (из Roadmap) ===",
        ...weekTasks.map((t) => `- ${t.title} (${t.type}): ${t.description}`),
        "",
        "Каждая задача дня должна быть конкретным шагом к выполнению одной из задач недели.",
      ].join("\n")
    : ""

  const roadmapOverview = roadmap?.weeks?.length
    ? [
        "",
        "=== ROADMAP (обзор) ===",
        `Всего недель: ${roadmap.durationWeeks ?? roadmap.weeks.length}`,
        ...roadmap.weeks.slice(0, 3).map((w) =>
          `  Неделя ${w.number}: ${w.title} [${w.status}] — ${w.subjects.join(", ")}`
        ),
      ].join("\n")
    : ""

  const historyContext = dailyHistory?.length
    ? [
        "",
        "=== ИСТОРИЯ ПРЕДЫДУЩИХ ДНЕЙ ===",
        ...dailyHistory.slice(0, 5).map((h) =>
          `  ${h.planDate}: ${h.title} — задач: ${h.tasks.length}, выполнено: ${h.tasks.filter((t) => t.completed).length}`
        ),
      ].join("\n")
    : ""

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Goal ID: ${goalId}`,
      roadmapId ? `Roadmap ID: ${roadmapId}` : null,
      planId ? `Plan ID: ${planId}` : null,
      `Цель: ${nctTitle} (код НЦТ: ${nctCode})`,
      `Текущая неделя: ${weekTitle}`,
      `Предметы: ${weekSubjects.join(", ")}`,
      "",
      planContext,
      "",
      diagnosticContext,
      miniTestContext,
      weekTasksContext,
      roadmapOverview,
      historyContext,
      adaptation,
      "",
      "Сгенерируй план на день: 4-6 задач.",
      "Не повторяй задачи из предыдущих дней, если они уже выполнены.",
      "Приоритеты: сначала общий план, потом диагностика, потом roadmap, потом цель, потом прогресс.",
      "",
      "Ответь JSON строго по схеме:",
      "{",
      '  "tasks": [',
      "    {",
      '      "id": "dt1",',
      '      "title": "Изучить квадратные уравнения",',
      '      "type": "study",',
      '      "description": "Повторить теорию и решить 5 задач",',
      '      "duration": 25',
      "    }",
      "  ]",
      "}",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ]
      .filter((line): line is string => typeof line === "string" && line.length > 0)
      .join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.4,
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
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
      } catch {
        throw new Error("Failed to parse daily plan JSON")
      }
    } else {
      throw new Error("Failed to parse daily plan JSON")
    }
  }

  const result = DailyPlanResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Daily plan validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  const today = planDate || new Date().toISOString().slice(0, 10)
  return {
    date: today,
    weekId,
    tasks: result.data.tasks.map((t): CoachDayTask => ({
      ...t,
      completed: false,
    })),
  }
}

function buildAdaptationHint(
  completed: number,
  skipped: number,
  miniTestResults?: CoachMiniTestResult[],
): string {
  const weakSubjects = miniTestResults
    ?.filter((m) => m.correctAnswers < m.totalQuestions * 0.6)
    .map((m) => m.subject)

  const weakHint = weakSubjects?.length
    ? ` Фокус на слабых темах: ${weakSubjects.join(", ")}.`
    : ""

  if (skipped > completed && skipped > 3) {
    return `АДАПТАЦИЯ: много пропущенных задач — снизь нагрузку, короткие задачи, возврат к основам.${weakHint}`
  }
  if (completed > 8) {
    return `АДАПТАЦИЯ: опережает — усложни задачи, добавь продвинутые темы.${weakHint}`
  }
  if (completed < 2) {
    return `АДАПТАЦИЯ: мало выполненных — упрости задачи, обзорные задания.${weakHint}`
  }
  return `АДАПТАЦИЯ: стандартная нагрузка.${weakHint}`
}
