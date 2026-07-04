import type { DeepSeekMessage } from "@/lib/ai/deepseek"
import type {
  CoachGoal,
  CoachRoadmap,
  CoachDayPlan,
  CoachDiagnosticResult,
  CoachMiniTestResult,
  CoachProgress,
} from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import type { DailyPlanRecord } from "@/types/admission"

export interface CoachContextOptions {
  goal?: CoachGoal | null
  plan?: DevelopmentPlan | null
  roadmap?: CoachRoadmap | null
  dayPlan?: CoachDayPlan | null
  dailyHistory?: DailyPlanRecord[] | null
  diagnostics?: CoachDiagnosticResult | null
  miniTests?: CoachMiniTestResult[] | null
  progress?: CoachProgress | null
}

export function buildCoachContext(options: CoachContextOptions = {}): DeepSeekMessage {
  const { goal, plan, roadmap, dayPlan, dailyHistory, diagnostics, miniTests, progress } = options

  const parts: string[] = [
    "Ты - персональный наставник по подготовке к поступлению в Казахстане.",
    "Твоя задача - помогать абитуриенту двигаться к цели и не терять контекст между днями.",
  ]

  parts.push("", "=== ЦЕЛЬ ===")
  if (goal) {
    parts.push(`Цель: ${goal.nctTitle} (код НЦТ: ${goal.nctCode})`)
    if (goal.university) parts.push(`Университет: ${goal.university}`)
    if (goal.profession) parts.push(`Профессия: ${goal.profession}`)
    if (goal.city) parts.push(`Город: ${goal.city}`)
    parts.push(`Статус цели: ${goal.status}`)
  } else {
    parts.push("Цель не выбрана.")
  }

  parts.push("", "=== ОБЩИЙ ПЛАН ===")
  if (plan) {
    parts.push(`Уровень плана: ${plan.level}`)
    parts.push(`Цели: ${plan.goals.map((g) => g.title).join(", ")}`)
    parts.push(`Этапов: ${plan.stages.length}`)
  } else {
    parts.push("Общий план ещё не создан.")
  }

  parts.push("", "=== ROADMAP ===")
  if (roadmap?.weeks?.length) {
    const active = roadmap.weeks.find((w) => w.status === "active")
    if (active) {
      parts.push(`Текущая неделя: ${active.number}. ${active.title}`)
      parts.push(`Предметы: ${active.subjects.join(", ")}`)
    }
    const done = roadmap.weeks.filter((w) => w.status === "completed").length
    parts.push(`Прогресс: ${done}/${roadmap.weeks.length} недель`)
  } else {
    parts.push("Roadmap не построен.")
  }

  parts.push("", "=== СЕГОДНЯ ===")
  if (dayPlan?.tasks?.length) {
    const completed = dayPlan.tasks.filter((t) => t.completed).length
    parts.push(`Задач сегодня: ${dayPlan.tasks.length}, выполнено: ${completed}`)
  } else {
    parts.push("План на сегодня не задан.")
  }

  if (dailyHistory?.length) {
    const latest = dailyHistory[0]
    parts.push("", "=== ИСТОРИЯ ДНЕЙ ===")
    parts.push(`Последний план: ${latest.planDate} (${latest.title})`)
  }

  parts.push("", "=== ДИАГНОСТИКА ===")
  if (diagnostics?.subjects?.length) {
    diagnostics.subjects.forEach((s) => parts.push(`${s.subject}: ${s.level} (${s.score}%)`))
    if (diagnostics.strengths.length) parts.push(`Сильные: ${diagnostics.strengths.join(", ")}`)
    if (diagnostics.weaknesses.length) parts.push(`Слабые: ${diagnostics.weaknesses.join(", ")}`)
  } else {
    parts.push("Диагностика не пройдена.")
  }

  parts.push("", "=== МИНИ-ТЕСТЫ ===")
  if (miniTests?.length) {
    miniTests.forEach((m) => parts.push(`${m.subject}: ${m.correctAnswers}/${m.totalQuestions}`))
  } else {
    parts.push("Мини-тесты не выполнялись.")
  }

  parts.push("", "=== ПРОГРЕСС ===")
  if (progress) {
    parts.push(`Streak: ${progress.currentStreak} дн., всего активно: ${progress.totalDaysActive} дн.`)
    parts.push(`Задач: ${progress.totalTasksCompleted} выполнено из ${progress.totalTasksPlanned}`)
    parts.push(`Прогресс roadmap: ${progress.roadmapCompletionPercent}%`)
  } else {
    parts.push("Данные прогресса отсутствуют.")
  }

  parts.push(
    "",
    "=== ИНСТРУКЦИИ ===",
    "Отвечай только в контексте подготовки к поступлению.",
    "Учитывай цель, план, roadmap, today и прогресс как единую систему.",
    "Если цель уже передана, не проси повторно вводить код НЦТ, университет или профессию.",
    "Если какого-то атрибута не хватает, не запрашивай все данные заново - используй текущий контекст и продолжай помощь.",
    "Если уместно, предлагай короткие практические шаги на сегодня.",
    "Мини-тесты предлагай только по изученным темам.",
    "Всегда возвращай валидный JSON без markdown.",
    "",
    "=== ФОРМАТ ОТВЕТА ===",
    'Всегда возвращай JSON с полем "reply".',
    'Для мини-теста: {"reply":"...","type":"mini_test","subject":"Предмет","questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0}]}',
  )

  return { role: "system", content: parts.join("\n") }
}
