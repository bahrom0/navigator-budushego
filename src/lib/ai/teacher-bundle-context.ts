import type { ActiveGoalBundle } from "@/types/admission"
import type { TeacherBundleContext } from "@/types/teacher"

export function buildTeacherBundleContext(
  bundle: ActiveGoalBundle | null,
): TeacherBundleContext | null {
  if (!bundle) return null

  const activeWeek =
    bundle.roadmap?.weeks.find((week) => week.status === "active")
    ?? bundle.roadmap?.weeks[0]
    ?? null

  return {
    goalCode: bundle.goal?.nctCode,
    goalTitle: bundle.goal?.nctTitle,
    university: bundle.goal?.university,
    city: bundle.goal?.city,
    planLevel: bundle.generalPlan?.level,
    planStageTitles: bundle.generalPlan?.stages.map((stage) => stage.title) ?? [],
    currentWeekNumber: bundle.roadmap?.currentWeekNumber ?? activeWeek?.number,
    currentWeekTitle: activeWeek?.title,
    currentWeekSubjects: activeWeek?.subjects ?? [],
    todayPlanDate: bundle.todayPlan?.planDate,
    todayTaskTitles: bundle.todayPlan?.tasks.map((task) => task.title) ?? [],
  }
}
