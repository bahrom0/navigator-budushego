export const ACTIVITY_EVENT_TYPES = [
  "open_app",
  "choose_category",
  "start_analysis",
  "view_recommendation",
  "bookmark_code",
  "open_profile",
  "start_interview",
  "finish_interview",
  "generate_plan",
  "save_plan",
  "complete_plan_step",
  "test_plan",
  "complete_plan",
  "regenerate_plan",
  "use_teacher",
  "coach_goal_set",
  "coach_diagnostic_taken",
  "coach_roadmap_created",
  "coach_day_completed",
  "coach_task_completed",
  "coach_mini_test_taken",
  "coach_streak_milestone",
  "coach_goal_achieved",
] as const

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number]

export const PRIORITY_ACTIVITY_EVENT_TYPES = [
  "choose_category",
  "start_analysis",
  "start_interview",
  "finish_interview",
  "generate_plan",
  "save_plan",
  "complete_plan_step",
  "test_plan",
  "complete_plan",
  "regenerate_plan",
  "use_teacher",
  "coach_goal_set",
  "coach_diagnostic_taken",
  "coach_roadmap_created",
  "coach_day_completed",
  "coach_task_completed",
  "coach_mini_test_taken",
  "coach_streak_milestone",
  "coach_goal_achieved",
] as const

export type PriorityActivityEventType = (typeof PRIORITY_ACTIVITY_EVENT_TYPES)[number]

const PRIORITY_ACTIVITY_EVENT_SET = new Set<string>(PRIORITY_ACTIVITY_EVENT_TYPES)

export function isPriorityActivityEventType(type: string): type is PriorityActivityEventType {
  return PRIORITY_ACTIVITY_EVENT_SET.has(type)
}

export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  open_app: "Запуск приложения",
  choose_category: "Выбор направления",
  start_analysis: "Запуск анализа",
  view_recommendation: "Открытие рекомендаций",
  bookmark_code: "Сохранение кода в закладки",
  open_profile: "Открытие профиля",
  start_interview: "Начало AI-собеседования",
  finish_interview: "Завершение AI-собеседования",
  generate_plan: "Генерация общего плана",
  save_plan: "Сохранение плана в аккаунт",
  complete_plan_step: "Завершение шага общего плана",
  test_plan: "Прохождение проверки плана",
  complete_plan: "Завершение общего плана",
  regenerate_plan: "Пересборка общего плана",
  use_teacher: "Использование AI Chat",
  coach_goal_set: "Установка цели в Coach",
  coach_diagnostic_taken: "Прохождение диагностики",
  coach_roadmap_created: "Создание roadmap в Coach",
  coach_day_completed: "Завершение учебного дня",
  coach_task_completed: "Завершение задачи Coach",
  coach_mini_test_taken: "Прохождение мини-теста",
  coach_streak_milestone: "Достижение серии дней",
  coach_goal_achieved: "Достижение цели",
}
