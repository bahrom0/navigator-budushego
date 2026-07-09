import type { DeepSeekMessage } from "@/lib/ai/deepseek"
import type { CoachGoal } from "@/types/coach"
import type { ProfileData, PlanRecord } from "@/types/profile"
import type { TeacherBundleContext, TeacherEntryContext } from "@/types/teacher"
import { isPriorityActivityEventType } from "@/types/activity"

function resolveActiveGoal(profile: ProfileData): CoachGoal | null {
  return profile.activeGoal ?? null
}

function getCompletedStepIds(profile: ProfileData): string[] {
  return profile.activityLog
    .filter((event) => {
      const isPriority = typeof event.isPriority === "boolean"
        ? event.isPriority
        : isPriorityActivityEventType(event.type)

      return isPriority && event.type === "complete_plan_step"
    })
    .map((event) => event.label)
}

function formatGoal(goal: CoachGoal | null): string {
  if (!goal) return "Активная цель: не выбрана"

  return [
    `Активная цель: ${goal.nctTitle} (${goal.nctCode})`,
    goal.university ? `Вуз: ${goal.university}` : null,
    goal.profession ? `Профессия: ${goal.profession}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

function formatPlan(plan: PlanRecord | null, completedIds: string[]): string {
  if (!plan) return "Активный general plan: отсутствует"

  const stageLines = plan.stages.map((stage) => {
    const status = completedIds.includes(stage.id) ? "выполнен" : "в работе"
    return `- ${stage.title}: ${stage.description} (${status})`
  })

  return [
    `General plan: ${plan.nctTitle} (${plan.nctCode})`,
    `Уровень: ${plan.level}`,
    `Этапов: ${plan.stages.length}`,
    "Ключевые этапы:",
    ...stageLines,
  ].join("\n")
}

function formatRecentSignals(profile: ProfileData): string {
  const signals = profile.activityLog
    .filter((event) => {
      const isPriority = typeof event.isPriority === "boolean"
        ? event.isPriority
        : isPriorityActivityEventType(event.type)

      return isPriority
    })
    .slice(-5)

  if (signals.length === 0) return "Сигналы прогресса: пока нет"

  return [
    "Последние значимые сигналы прогресса:",
    ...signals.map((event) => `- ${event.label}`),
  ].join("\n")
}

function formatBundleContext(bundleContext?: TeacherBundleContext | null): string {
  if (!bundleContext) return "Канонический ActiveGoalBundle: недоступен"

  const lines = [
    bundleContext.goalCode && bundleContext.goalTitle
      ? `Активная цель bundle: ${bundleContext.goalTitle} (${bundleContext.goalCode})`
      : "Активная цель bundle: недоступна",
    bundleContext.university ? `Вуз: ${bundleContext.university}` : null,
    bundleContext.city ? `Город: ${bundleContext.city}` : null,
    bundleContext.planLevel ? `Уровень general plan: ${bundleContext.planLevel}` : null,
    bundleContext.planStageTitles.length > 0
      ? `Этапы general plan: ${bundleContext.planStageTitles.join(" | ")}`
      : "Этапы general plan: недоступны",
    bundleContext.currentWeekTitle
      ? `Активная неделя roadmap: ${bundleContext.currentWeekNumber ?? "?"} — ${bundleContext.currentWeekTitle}`
      : null,
    bundleContext.currentWeekSubjects.length > 0
      ? `Темы активной недели: ${bundleContext.currentWeekSubjects.join(", ")}`
      : null,
    bundleContext.todayPlanDate ? `План на день: ${bundleContext.todayPlanDate}` : null,
    bundleContext.todayTaskTitles.length > 0
      ? `Задачи на день: ${bundleContext.todayTaskTitles.join(" | ")}`
      : null,
  ].filter(Boolean)

  return lines.join("\n")
}

function formatEntryContext(context?: TeacherEntryContext | null): string | null {
  if (!context) return null

  const lines = [
    context.source ? `Источник входа: ${context.source}` : null,
    context.topic ? `Тема: ${context.topic}` : null,
    context.stageTitle ? `Этап плана: ${context.stageTitle}` : null,
    context.taskTitle ? `Задача Coach: ${context.taskTitle}` : null,
    context.taskType ? `Тип задачи: ${context.taskType}` : null,
    context.weekTitle ? `Неделя roadmap: ${context.weekTitle}` : null,
    typeof context.weekNumber === "number" ? `Номер недели: ${context.weekNumber}` : null,
    context.question ? `Формулировка запроса: ${context.question}` : null,
  ].filter(Boolean)

  if (lines.length === 0) return null
  return ["=== КОНТЕКСТ ВХОДА ===", ...lines].join("\n")
}

export interface TeacherContextInput {
  profile: ProfileData
  activePlan: PlanRecord | null
  bundleContext?: TeacherBundleContext | null
  context?: TeacherEntryContext | null
}

export function buildTeacherContext(input: TeacherContextInput): DeepSeekMessage[] {
  const { profile, activePlan, bundleContext, context } = input
  const activeGoal = resolveActiveGoal(profile)
  const completedIds = activePlan ? getCompletedStepIds(profile) : []

  const contextParts = [
    "Ты — AI Chat в NCT Navigator.",
    "Ты отдельный вспомогательный AI-слой рядом с основным продуктом, а не основной workflow.",
    "Твоя задача: объяснять темы, термины, шаги плана, NCT-коды и учебные вопросы простым и точным языком.",
    "Используй канонический ActiveGoalBundle как основной контекст goal, plan, roadmap и today.",
    "Goal, general plan, roadmap и today нужны тебе только как опора для объяснения, а не как повод перехватить workflow.",
    "Не дублируй Coach.",
    "Не выбирай цель за пользователя.",
    "Не строй новый general plan, roadmap или today plan.",
    "Не назначай следующий ежедневный шаг вместо Coach.",
    "Если вопрос сводится к выбору цели, перепланированию маршрута или приоритизации дня, коротко ответь по смыслу и направь пользователя обратно в Recommendations, Plan или Coach.",
    "Если вопрос касается конкретной задачи, этапа или темы, помоги понять материал, логику шага и как к нему подступиться без перехвата управления.",
    "",
    "=== ACTIVE GOAL BUNDLE ===",
    formatBundleContext(bundleContext),
    "",
    "=== ПРОФИЛЬ ===",
    `Уровень: ${profile.level}`,
    `Последние коды НЦТ: ${profile.lastNctCodes.join(", ") || "не выбраны"}`,
    formatGoal(activeGoal),
    "",
    "=== КОНТЕКСТ ЦЕЛИ И ПЛАНА ===",
    formatPlan(activePlan, completedIds),
    "",
    formatRecentSignals(profile),
    "",
    formatEntryContext(context),
    "",
    "=== ФОРМАТ ОТВЕТА ===",
    "- Отвечай по делу и без маркетинговых обещаний.",
    "- Давай 3-6 предложений, если пользователь не просит глубже.",
    "- Если уместно, предложи 1 следующий учебный вопрос или 1 способ разобрать тему.",
    "- Не используй markdown-кодовые блоки.",
    "- Отвечай только валидный JSON без markdown.",
  ].filter((part): part is string => Boolean(part))

  return [
    {
      role: "system",
      content: contextParts.join("\n"),
    },
  ]
}

export function buildReminderPrompt(): string | null {
  return null
}
