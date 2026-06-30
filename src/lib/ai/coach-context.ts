import type { DeepSeekMessage } from "@/lib/ai/deepseek"
import type { CoachGoal, CoachRoadmap, CoachDayPlan, CoachDiagnosticResult, CoachMiniTestResult, CoachProgress } from "@/types/coach"

export function buildCoachContext(
  goal?: CoachGoal | null,
  roadmap?: CoachRoadmap | null,
  dayPlan?: CoachDayPlan | null,
  diagnostics?: CoachDiagnosticResult | null,
  miniTests?: CoachMiniTestResult[] | null,
  progress?: CoachProgress | null,
): DeepSeekMessage {
  const parts: string[] = [
    "Ты — персональный наставник по подготовке к поступлению в Казахстане.",
    "Твоя задача — помогать абитуриенту готовиться к НЦТ.",
  ]

  parts.push("", "=== ЦЕЛЬ ===")
  if (goal) {
    parts.push(`Цель: ${goal.nctTitle} (код НЦТ: ${goal.nctCode})`)
    if (goal.university) parts.push(`Университет: ${goal.university}`)
  } else {
    parts.push("Цель не выбрана.")
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

  parts.push("", "=== ДНЕВНОЙ ПЛАН ===")
  if (dayPlan?.tasks?.length) {
    const completed = dayPlan.tasks.filter((t) => t.completed).length
    parts.push(`Задач сегодня: ${dayPlan.tasks.length}, выполнено: ${completed}`)
  } else {
    parts.push("Дневной план не задан.")
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
    parts.push(`Прогресс roadmaps: ${progress.roadmapCompletionPercent}%`)
  } else {
    parts.push("Данные прогресса отсутствуют.")
  }

  parts.push(
    "",
    "=== ИНСТРУКЦИИ ===",
    "Ты персональный наставник по подготовке к поступлению, не чат-бот общего назначения.",
    "Отвечай только в контексте подготовки.",
    "Предлагай мини-тесты по изученным темам.",
    "Мотивируй, но не дави.",
    "Адаптируй рекомендации под текущий прогресс.",
    "Отвечай только валидный JSON без markdown.",
    "",
    "=== ФОРМАТ ОТВЕТА ===",
    "Всегда возвращай JSON с полем \"reply\" (текст ответа).",
    "Для мини-тестов: {\"reply\": \"...\", \"type\": \"mini_test\", \"subject\": \"Предмет\", \"questions\": [{\"question\": \"...\", \"options\": [\"вариант A\",\"вариант B\",\"вариант C\",\"вариант D\"], \"correctIndex\": 0}]}.",
    "correctIndex — это 0-based индекс правильного варианта в массиве options.",
    "Не используй ключ \"mini_test\" на верхнем уровне.",
  )

  return { role: "system", content: parts.join("\n") }
}
