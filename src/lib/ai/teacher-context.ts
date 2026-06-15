import type { ProfileData, PlanRecord } from "@/types/profile"
import type { DeepSeekMessage } from "@/lib/ai/deepseek"

function getCompletedStepIds(profile: ProfileData): string[] {
  return profile.activityLog
    .filter((e) => e.type === "complete_plan_step")
    .map((e) => e.label)
}

function formatPlanWithProgress(plan: PlanRecord, completedIds: string[]): string {
  const completedCount = plan.stages.filter((s) => completedIds.includes(s.id)).length
  const lines: string[] = [
    `План развития: ${plan.nctTitle} (код ${plan.nctCode})`,
    `Уровень: ${plan.level}`,
    `Прогресс: ${completedCount}/${plan.stages.length} этапов выполнено`,
  ]

  plan.goals.forEach((g) => {
    lines.push(`- Цель: ${g.title} — ${g.description}`)
  })

  lines.push("Этапы плана:")
  plan.stages.forEach((s) => {
    const status = completedIds.includes(s.id) ? "[ВЫПОЛНЕНО]" : "[НЕ ВЫПОЛНЕНО]"
    lines.push(`  ${status} ${s.id}: ${s.title} — ${s.description}`)
    s.skills.forEach((sk) => lines.push(`    навык: ${sk}`))
  })

  return lines.join("\n")
}

function formatAchievements(profile: ProfileData): string {
  if (profile.achievements.length === 0) return "Достижения: пока нет"
  const lines = profile.achievements.map((a) => {
    const status = a.unlockedAt ? `получено ${new Date(a.unlockedAt).toLocaleDateString("ru-RU")}` : "заблокировано"
    return `- ${a.title}: ${a.description} (${status})`
  })
  return ["Достижения:", ...lines].join("\n")
}

function formatActivity(profile: ProfileData): string {
  if (profile.activityLog.length === 0) return "Активность: пока нет"
  const recent = profile.activityLog.slice(0, 10)
  return recent
    .map((e) => `- ${e.label} (${new Date(e.timestamp).toLocaleDateString("ru-RU")})`)
    .join("\n")
}

function formatInterviews(profile: ProfileData): string {
  if (profile.interviews.length === 0) return "Интервью: не проводились"
  return profile.interviews
    .map(
      (i) =>
        `- ${i.nctTitle}: уровень ${i.level ?? "не определён"}, вопросов: ${i.questions.length}`,
    )
    .join("\n")
}

function formatBookmarks(profile: ProfileData): string {
  if (profile.bookmarks.length === 0) return "Закладки: пока нет"
  return profile.bookmarks
    .map((b) => `- ${b.nctTitle} (${b.nctCode})`)
    .join("\n")
}

export interface TeacherContextInput {
  profile: ProfileData
  activePlan: PlanRecord | null
}

export function buildTeacherContext(input: TeacherContextInput): DeepSeekMessage[] {
  const { profile, activePlan } = input
  const completedIds = activePlan ? getCompletedStepIds(profile) : []
  const planSection = activePlan
    ? formatPlanWithProgress(activePlan, completedIds)
    : "Активный план: отсутствует"

  const contextParts: string[] = [
    "Ты — AI-наставник MMT Navigator. Твоя задача — помогать пользователю в выборе и освоении специальностей.",
    "Ты знаешь профиль пользователя и используешь эти знания в каждом ответе.",
    "Не превращай диалог в чат-бот. Используй формат Mentor Cards: короткие, ёмкие сообщения.",
    "",
    "=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===",
    `Уровень: ${profile.level}`,
    `Последние коды НЦТ: ${profile.lastNctCodes.join(", ") || "не выбраны"}`,
    "",
    "=== ПЛАН РАЗВИТИЯ ===",
    planSection,
    "",
    "=== ДОСТИЖЕНИЯ ===",
    formatAchievements(profile),
    "",
    "=== АКТИВНОСТЬ ===",
    formatActivity(profile),
    "",
    "=== ИНТЕРВЬЮ ===",
    formatInterviews(profile),
    "",
    "=== ЗАКЛАДКИ ===",
    formatBookmarks(profile),
    "",
    "=== ИНСТРУКЦИИ ===",
    "- Отвечай кратко (2-4 предложения).",
    "- Если видишь невыполненные этапы плана — мягко напоминай о них.",
    "- Предлагай мини-проверки знаний по теме выбранного направления.",
    "- Если пользователь выполнил все этапы — поздравь и предложи новый план.",
    "- Можешь задавать уточняющие вопросы о прогрессе.",
    "- Отвечай только валидный JSON без markdown.",
  ]

  const systemPrompt: DeepSeekMessage = {
    role: "system",
    content: contextParts.join("\n"),
  }

  return [systemPrompt]
}

export function buildReminderPrompt(profile: ProfileData, activePlan: PlanRecord | null): string | null {
  if (!activePlan) return null

  const completedIds = getCompletedStepIds(profile)
  const incomplete = activePlan.stages.filter((s) => !completedIds.includes(s.id))

  if (incomplete.length === 0) return null

  const prompt = [
    "У пользователя есть невыполненные этапы плана:",
    ...incomplete.map((s) => `- ${s.title}: ${s.description}`),
    "Мягко напомни о них и предложи помощь.",
  ].join("\n")

  return prompt
}
