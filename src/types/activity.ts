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
] as const

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number]

export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  open_app: "Запуск приложения",
  choose_category: "Выбор направления",
  start_analysis: "Запуск анализа",
  view_recommendation: "Просмотр рекомендации",
  bookmark_code: "Сохранение кода в закладки",
  open_profile: "Открытие профиля",
  start_interview: "Начало AI-собеседования",
  finish_interview: "Завершение AI-собеседования",
  generate_plan: "Генерация плана развития",
  save_plan: "Сохранение плана",
  complete_plan_step: "Выполнение шага плана",
  test_plan: "Тестирование плана",
  complete_plan: "Завершение плана развития",
  regenerate_plan: "Регенерация плана",
  use_teacher: "Общение с AI Teacher",
}
