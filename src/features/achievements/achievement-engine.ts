import { useProfileStore } from "@/stores/profile-store"

export interface AchievementDef {
  id: string
  title: string
  description: string
  check: () => boolean
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first_analysis",
    title: "Первый анализ",
    description: "Запустили первый анализ направлений",
    check: () => useProfileStore.getState().activityLog.some((e) => e.type === "start_analysis"),
  },
  {
    id: "first_bookmarks",
    title: "Первые закладки",
    description: "Сохранили 3 кода НЦТ в закладки",
    check: () => useProfileStore.getState().bookmarks.length >= 3,
  },
  {
    id: "first_interview",
    title: "Первое интервью",
    description: "Прошли AI-собеседование",
    check: () => useProfileStore.getState().interviews.length >= 1,
  },
  {
    id: "first_plan",
    title: "Первый план",
    description: "Сохранили первый план развития",
    check: () => useProfileStore.getState().plans.length >= 1,
  },
  {
    id: "first_completed_plan",
    title: "Первый завершённый план",
    description: "Прошли все этапы плана развития и успешно сдали тест",
    check: () => useProfileStore.getState().plans.some((p) => p.status === "completed"),
  },
  {
    id: "five_days_active",
    title: "5 дней активности",
    description: "Возвращались в приложение 5 дней",
    check: () => {
      const days = new Set(
        useProfileStore.getState().activityLog.map((e) => new Date(e.timestamp).toDateString()),
      )
      return days.size >= 5
    },
  },
  {
    id: "ten_actions",
    title: "10 действий",
    description: "Выполнили 10 действий в профиле",
    check: () => useProfileStore.getState().activityLog.length >= 10,
  },
  {
    id: "three_interviews",
    title: "3 интервью",
    description: "Прошли 3 AI-собеседования",
    check: () => useProfileStore.getState().interviews.length >= 3,
  },
]

export function checkAndUnlockAchievements(): void {
  const state = useProfileStore.getState()
  const unlockedIds = new Set(state.achievements.filter((a) => a.unlockedAt).map((a) => a.id))

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlockedIds.has(def.id)) continue
    if (def.check()) {
      useProfileStore.getState().unlockAchievement({
        id: def.id,
        title: def.title,
        description: def.description,
      })
    }
  }
}
