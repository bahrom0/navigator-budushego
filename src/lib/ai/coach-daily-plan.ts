import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type {
  CoachDayPlan,
  CoachDayTask,
  CoachDiagnosticResult,
  CoachMiniTestResult,
  CoachWeekTask,
} from "@/types/coach"

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
  nctCode: string
  nctTitle: string
  weekTitle: string
  weekSubjects: string[]
  weekTasks: CoachWeekTask[]
  previousCompletedCount?: number
  previousSkippedCount?: number
  diagnosticResult?: CoachDiagnosticResult | null
  miniTestResults?: CoachMiniTestResult[]
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты — персональный наставник по подготовке к поступлению в Казахстане.",
    "Генерируешь план на день для абитуриента.",
    "План содержит 4-6 задач разных типов: study, practice, review, test.",
    "Каждая задача имеет длительность в минутах (5-120).",
    "Учитывай прогресс: если опережает — усложняй, если отстаёт — упрощай.",
    "Если пропущено много задач — снизь нагрузку, верни к слабым темам.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

export async function generateDailyPlan(
  options: GenerateDailyPlanOptions,
): Promise<CoachDayPlan> {
  const {
    goalId,
    weekId,
    nctCode,
    nctTitle,
    weekTitle,
    weekSubjects,
    weekTasks,
    previousCompletedCount,
    previousSkippedCount,
    diagnosticResult,
    miniTestResults,
  } = options

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
          (m) =>
            `${m.subject}: ${m.correctAnswers}/${m.totalQuestions} правильных`,
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
        ...weekTasks.map(
          (t) => `- ${t.title} (${t.type}): ${t.description}`,
        ),
        "",
        "Каждая задача дня должна быть конкретным шагом к выполнению одной из задач недели.",
        "Например: если задача недели 'Изучить логарифмы', то задача дня — 'Изучить определение логарифма'",
      ].join("\n")
    : ""

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Цель: ${nctTitle} (код НЦТ: ${nctCode})`,
      `Текущая неделя: ${weekTitle}`,
      `Предметы: ${weekSubjects.join(", ")}`,
      diagnosticContext,
      miniTestContext,
      weekTasksContext,
      adaptation,
      "",
      "Сгенерируй план на день: 4-6 задач.",
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
    ].join("\n"),
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
    throw new Error("Failed to parse daily plan JSON")
  }

  const result = DailyPlanResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Daily plan validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  const today = new Date().toISOString().slice(0, 10)
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
