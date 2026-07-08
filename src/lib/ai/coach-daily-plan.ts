import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type {
  CoachDayPlan,
  CoachDayTask,
  CoachDiagnosticResult,
  CoachMiniTestResult,
  CoachRoadmap,
  CoachWeekTask,
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
  dayContext?: Record<string, unknown> | null
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты персональный AI-коуч по подготовке к поступлению в Казахстане.",
    "Твоя задача — генерировать план только на один день.",
    "План должен содержать 4-6 задач типов study, practice, review, test.",
    "Каждая задача должна быть конкретной, отличимой от задач предыдущих дней и иметь длительность 5-120 минут.",
    "Опирайся на общий план, диагностику, roadmap, историю предыдущих дней и позицию текущего дня в маршруте.",
    "Нельзя повторять вчерашние или уже выполненные задачи дословно и по смыслу.",
    "Если в прошлые дни уже был разбор темы, следующий день должен продвигать ученика на новый шаг, а не копировать то же самое другими словами.",
    "Отвечай только валидным JSON без markdown.",
  ].join(" "),
}

function buildPlanContext(plan?: DevelopmentPlan | null): string {
  if (!plan) return "(Общий план пока не создан.)"

  const lines: string[] = [
    "=== ОБЩИЙ ПЛАН ===",
    `Уровень: ${plan.level}`,
  ]

  if (plan.goals.length > 0) {
    lines.push("Цели:")
    plan.goals.forEach((goal) => lines.push(`- ${goal.title}: ${goal.description}`))
  }

  if (plan.stages.length > 0) {
    lines.push("Этапы:")
    plan.stages.forEach((stage) => {
      lines.push(`- ${stage.title}: ${stage.description}`)
      if (stage.recommendations?.length) {
        lines.push(`  Рекомендации: ${stage.recommendations.join("; ")}`)
      }
    })
  }

  return lines.join("\n")
}

function buildDiagnosticContext(diagnosticResult?: CoachDiagnosticResult | null): string {
  if (!diagnosticResult) return "(Диагностика не пройдена.)"

  return [
    "=== ДИАГНОСТИКА ===",
    ...diagnosticResult.subjects.map((subject) => `${subject.subject}: ${subject.level} (${subject.score}%)`),
    `Слабые темы: ${diagnosticResult.weaknesses.join(", ") || "не указаны"}`,
    `Сильные темы: ${diagnosticResult.strengths.join(", ") || "не указаны"}`,
  ].join("\n")
}

function buildMiniTestContext(miniTestResults?: CoachMiniTestResult[]): string {
  if (!miniTestResults?.length) return ""

  return [
    "",
    "=== МИНИ-ТЕСТЫ ===",
    ...miniTestResults.map((result) => `${result.subject}: ${result.correctAnswers}/${result.totalQuestions} правильных`),
  ].join("\n")
}

function buildWeekTasksContext(weekTasks: CoachWeekTask[]): string {
  if (weekTasks.length === 0) return ""

  return [
    "",
    "=== ЗАДАЧИ НЕДЕЛИ ИЗ ROADMAP ===",
    ...weekTasks.map((task) => `- ${task.title} (${task.type}): ${task.description}`),
    "Каждая задача дня должна быть реальным шагом к выполнению этих недельных задач.",
  ].join("\n")
}

function buildRoadmapOverview(roadmap?: CoachRoadmap | null): string {
  if (!roadmap?.weeks.length) return ""

  return [
    "",
    "=== ROADMAP ===",
    `Всего недель: ${roadmap.durationWeeks ?? roadmap.weeks.length}`,
    ...roadmap.weeks.slice(0, 6).map((week) => `Неделя ${week.number}: ${week.title} [${week.status}] — ${week.subjects.join(", ")}`),
  ].join("\n")
}

function buildSummaryHistoryContext(dailyHistory?: DailyPlanRecord[] | null): string {
  if (!dailyHistory?.length) return ""

  const recent = dailyHistory
    .slice()
    .sort((a, b) => b.planDate.localeCompare(a.planDate))
    .slice(0, 5)

  return [
    "",
    "=== ИСТОРИЯ ДНЕЙ ===",
    ...recent.map((day) => `${day.planDate}: ${day.title} — задач: ${day.tasks.length}, выполнено: ${day.tasks.filter((task) => task.completed).length}`),
  ].join("\n")
}

function buildDetailedHistoryContext(dailyHistory?: DailyPlanRecord[] | null): string {
  if (!dailyHistory?.length) return ""

  const recent = dailyHistory
    .slice()
    .sort((a, b) => b.planDate.localeCompare(a.planDate))
    .slice(0, 4)

  const lines: string[] = ["", "=== ДЕТАЛЬНО ЧТО УЖЕ БЫЛО ==="]

  recent.forEach((day) => {
    lines.push(`День ${day.planDate} — ${day.title}`)
    day.tasks.slice(0, 8).forEach((task) => {
      lines.push(`- [${task.completed ? "done" : "open"}] ${task.type}: ${task.title} — ${task.description}`)
    })
  })

  const completedTitles = recent.flatMap((day) => day.tasks.filter((task) => task.completed).map((task) => task.title)).slice(0, 12)
  const recentTitles = recent.flatMap((day) => day.tasks.map((task) => task.title)).slice(0, 16)

  if (completedTitles.length > 0) {
    lines.push("Уже завершённые задачи, которые нельзя повторять:")
    completedTitles.forEach((title) => lines.push(`- ${title}`))
  }

  if (recentTitles.length > 0) {
    lines.push("Недавние формулировки и фокусы, которые нельзя просто перефразировать:")
    recentTitles.forEach((title) => lines.push(`- ${title}`))
  }

  lines.push("Следующий день должен развивать уже пройденное и давать новый шаг вперёд.")

  return lines.join("\n")
}

function buildDayContext(dayContext?: Record<string, unknown> | null): string {
  if (!dayContext) return ""

  const progressionMode = (() => {
    const dayNumber = typeof dayContext.dayNumber === "number" ? dayContext.dayNumber : null
    if (!dayNumber) return null
    const modes = [
      "foundation: короткое укрепление базы и вход в тему",
      "application: применение темы на практике и на типовых задачах",
      "analysis: разбор ошибок, сравнение подходов и поиск слабых мест",
      "assessment: мини-проверка, самоконтроль и измерение прогресса",
      "extension: усложнение, перенос знания в новый контекст, углубление",
    ]
    return modes[(dayNumber - 1) % modes.length]
  })()

  return [
    "",
    "=== КОНТЕКСТ ТЕКУЩЕГО ДНЯ ===",
    typeof dayContext.promptSeed === "string" ? `Сигнал маршрута: ${dayContext.promptSeed}` : null,
    typeof dayContext.dayNumber === "number" && typeof dayContext.roadmapTotalDays === "number"
      ? `Позиция в маршруте: день ${dayContext.dayNumber} из ${dayContext.roadmapTotalDays}`
      : null,
    typeof dayContext.weekNumber === "number" ? `Номер недели: ${dayContext.weekNumber}` : null,
    typeof dayContext.weekTitle === "string" ? `Фокус недели: ${dayContext.weekTitle}` : null,
    progressionMode ? `Логика этого дня: ${progressionMode}` : null,
  ]
    .filter((line): line is string => typeof line === "string" && line.length > 0)
    .join("\n")
}

function buildAdaptationHint(
  completed: number,
  skipped: number,
  miniTestResults?: CoachMiniTestResult[],
): string {
  const weakSubjects = miniTestResults
    ?.filter((result) => result.correctAnswers < result.totalQuestions * 0.6)
    .map((result) => result.subject)

  const weakHint = weakSubjects?.length ? ` Фокус на слабых темах: ${weakSubjects.join(", ")}.` : ""

  if (skipped > completed && skipped > 3) {
    return `АДАПТАЦИЯ: было много пропусков — снизь нагрузку, делай более короткие задачи и укрепляй базу.${weakHint}`
  }
  if (completed > 8) {
    return `АДАПТАЦИЯ: ученик идёт с опережением — можно усложнить день и дать более продвинутые шаги.${weakHint}`
  }
  if (completed < 2) {
    return `АДАПТАЦИЯ: выполнено мало — упрости вход и дай понятные обзорные шаги.${weakHint}`
  }

  return `АДАПТАЦИЯ: стандартная нагрузка, но новый день должен всё равно отличаться от предыдущего.${weakHint}`
}

export async function generateDailyPlan(options: GenerateDailyPlanOptions): Promise<CoachDayPlan> {
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
    dayContext,
  } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Goal ID: ${goalId}`,
      roadmapId ? `Roadmap ID: ${roadmapId}` : null,
      planId ? `Plan ID: ${planId}` : null,
      `Цель: ${nctTitle} (код НЦТ: ${nctCode})`,
      `Текущая неделя: ${weekTitle}`,
      `Предметы недели: ${weekSubjects.join(", ")}`,
      "",
      buildPlanContext(generalPlan),
      "",
      buildDiagnosticContext(diagnosticResult),
      buildMiniTestContext(miniTestResults),
      buildWeekTasksContext(weekTasks),
      buildRoadmapOverview(roadmap),
      buildSummaryHistoryContext(dailyHistory),
      buildDetailedHistoryContext(dailyHistory),
      buildDayContext(dayContext),
      buildAdaptationHint(
        previousCompletedCount ?? 0,
        previousSkippedCount ?? 0,
        miniTestResults,
      ),
      "",
      "Сгенерируй план на день: 4-6 задач.",
      "Нельзя повторять уже выполненные задачи прошлых дней ни дословно, ни по смыслу.",
      "Если вчера была теория по теме, сегодня нужен следующий шаг: практика, применение, разбор ошибок, мини-тест или углубление.",
      "Каждая задача должна иметь новый микро-фокус внутри темы, а не быть косметическим переписыванием вчерашней формулировки.",
      "Сделай все 4-6 задач разными по функции: задачи не должны дублировать друг друга по смыслу.",
      "Если история прошлых дней непустая, используй её как главный запрет на повтор и как основу для следующего шага вперёд.",
      "Ответь строго JSON по схеме:",
      "{",
      '  "tasks": [',
      "    {",
      '      "id": "dt1",',
      '      "title": "Разобрать ...",',
      '      "type": "study",',
      '      "description": "Что именно сделать и зачем",',
      '      "duration": 25',
      "    }",
      "  ]",
      "}",
      "ВАЖНО: только валидный JSON без markdown.",
    ]
      .filter((line): line is string => typeof line === "string" && line.length > 0)
      .join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.45,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
    } else {
      throw new Error("Failed to parse daily plan JSON")
    }
  }

  const result = DailyPlanResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Daily plan validation failed: ${result.error.issues[0]?.message}`)
  }

  return {
    date: planDate || new Date().toISOString().slice(0, 10),
    weekId,
    tasks: result.data.tasks.map((task): CoachDayTask => ({
      ...task,
      completed: false,
    })),
  }
}
