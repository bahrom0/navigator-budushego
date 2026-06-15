import type { FitScoreResult, FitScoreFactor } from "@/types/strategy"

interface FitScoreInput {
  categories: string[]
  nctCode: string
  nctTitle: string
  interviewResult?: {
    summary?: string
    level?: string
    strengths?: string[]
    gaps?: string[]
  }
  matchedKeywords?: string[]
  confidence?: number
}

export function calculateFitScore(input: FitScoreInput): FitScoreResult {
  const { categories, matchedKeywords = [], confidence = 0, interviewResult } = input

  const interestScore = calculateInterestMatch(categories, matchedKeywords)
  const interviewScore = calculateInterviewMatch(interviewResult)
  const strengthScore = calculateStrengthScore(interviewResult)

  const factors: FitScoreFactor[] = [
    {
      name: "Совпадение интересов",
      score: Math.round(interestScore * 100),
      maxScore: 100,
      description: buildInterestDescription(interestScore, matchedKeywords.length),
    },
    {
      name: "Результаты собеседования",
      score: Math.round(interviewScore * 100),
      maxScore: 100,
      description: buildInterviewDescription(interviewScore, interviewResult),
    },
    {
      name: "Сильные стороны",
      score: Math.round(strengthScore * 100),
      maxScore: 100,
      description: buildStrengthDescription(strengthScore, interviewResult),
    },
  ]

  if (confidence > 0) {
    factors.push({
      name: "Достоверность данных",
      score: Math.round(confidence * 100),
      maxScore: 100,
      description: `Достоверность информации по направлению: ${Math.round(confidence * 100)}%`,
    })
  }

  const overallScore = Math.round(
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length,
  )

  const strengths = interviewResult?.strengths ?? extractStrengths(interestScore, interviewScore)
  const weaknesses = interviewResult?.gaps ?? extractWeaknesses(interestScore, interviewScore, confidence)

  const improvementPlan = buildImprovementPlan(overallScore, weaknesses)

  const summary = buildSummary(overallScore, categories)

  return {
    overallScore,
    factors,
    strengths,
    weaknesses,
    improvementPlan,
    summary,
  }
}

function calculateInterestMatch(categories: string[], keywords: string[]): number {
  if (categories.length === 0) return 0
  if (keywords.length === 0) return 0.3

  const categoryTokens = new Set(categories.join(" ").toLowerCase().split(/\s+/))
  const matchingTokens = keywords.filter((k) => categoryTokens.has(k.toLowerCase()))
  return Math.min(matchingTokens.length / Math.max(categoryTokens.size, 1) + 0.2, 1)
}

function calculateInterviewMatch(result?: { summary?: string; level?: string }): number {
  if (!result || !result.level) return 0.4

  const levelScores: Record<string, number> = {
    beginner: 0.4,
    intermediate: 0.7,
    advanced: 0.95,
  }

  return result.summary ? Math.min(levelScores[result.level] ?? 0.5, 1) : 0.5
}

function calculateStrengthScore(result?: { strengths?: string[] }): number {
  if (!result?.strengths || result.strengths.length === 0) return 0.5
  return Math.min(0.5 + result.strengths.length * 0.1, 1)
}

function buildInterestDescription(score: number, keywordCount: number): string {
  if (score >= 0.8) return "Ваши интересы хорошо совпадают с направлением"
  if (score >= 0.5) return `Частичное совпадение по ${keywordCount} ключевым интересам`
  return "Совпадение интересов требует дополнительного анализа"
}

function buildInterviewDescription(score: number, result?: { summary?: string }): string {
  if (result?.summary) return "Результаты собеседования учтены в оценке"
  return "Пройдите AI-собеседование для более точной оценки"
}

function buildStrengthDescription(score: number, result?: { strengths?: string[] }): string {
  if (result?.strengths && result.strengths.length > 0) {
    return `Определено ${result.strengths.length} сильных сторон: ${result.strengths.slice(0, 3).join(", ")}`
  }
  return "Пройдите интервью для выявления сильных сторон"
}

function extractStrengths(interestScore: number, interviewScore: number): string[] {
  const strengths: string[] = []
  if (interestScore > 0.6) strengths.push("Чёткое понимание своих интересов")
  if (interviewScore > 0.6) strengths.push("Успешное прохождение профориентации")
  if (strengths.length === 0) strengths.push("Готовность к самоопределению")
  return strengths
}

function extractWeaknesses(interestScore: number, interviewScore: number, confidence: number): string[] {
  const weaknesses: string[] = []
  if (interestScore < 0.5) weaknesses.push("Требуется уточнение интересов")
  if (interviewScore < 0.5) weaknesses.push("Рекомендуется пройти профориентационное интервью")
  if (confidence < 0.5) weaknesses.push("Недостаточно данных по выбранному направлению")
  if (weaknesses.length === 0) weaknesses.push("Продолжайте развиваться в выбранном направлении")
  return weaknesses
}

function buildImprovementPlan(score: number, weaknesses: string[]): string[] {
  const plan: string[] = []

  if (score < 50) {
    plan.push("Пройдите AI-собеседование для уточнения вашего уровня")
    plan.push("Изучите несколько направлений, чтобы расширить кругозор")
  }

  weaknesses.forEach((w) => {
    if (w.includes("интервью")) plan.push("Запишитесь на профориентационное интервью")
    if (w.includes("интересов")) plan.push("Попробуйте выбрать дополнительные категории для анализа")
  })

  plan.push("Составьте план подготовки на 30 дней")
  plan.push("Отслеживайте свой прогресс в профиле")

  return plan.slice(0, 5)
}

function buildSummary(score: number, categories: string[]): string {
  if (score >= 80) return `Отличное соответствие! Ваши интересы в сфере "${categories.join(", ")}" идеально подходят для выбранного направления.`
  if (score >= 60) return `Хорошее соответствие. У вас есть потенциал в сфере "${categories.join(", ")}", рекомендуется усилить подготовку.`
  if (score >= 40) return `Среднее соответствие. Рекомендуется дополнительно изучить направление и пройти собеседование.`
  return `Низкое соответствие. Попробуйте выбрать другие направления или пройти профориентацию.`
}
