import { nctCodes } from "@/lib/ai/nct-match"
import type { CompetitionLevel, CompetitionMeter } from "@/types/strategy"

interface CompetitionInput {
  code: string
  institution: string
  cluster: number
  confidence: number
}

export function evaluateCompetition(input: CompetitionInput): CompetitionMeter {
  const code = input.code
  const confidence = input.confidence
  const nctEntry = nctCodes.find((c) => c.code === code)
  const cluster = input.cluster ?? nctEntry?.cluster ?? 1

  const clusterCodes = nctCodes.filter((c) => c.cluster === cluster)
  const totalInCluster = clusterCodes.length
  const institutionsInCluster = new Set(clusterCodes.map((c) => c.institution)).size

  const alternativesCount = totalInCluster
  const institutionDiversity = institutionsInCluster / Math.max(totalInCluster, 1)
  const avgConfidence =
    clusterCodes.reduce((s, c) => s + c.confidence, 0) / Math.max(totalInCluster, 1)

  const popularity = totalInCluster / 500
  const alternativeScore = Math.min(alternativesCount / 100, 1)
  const institutionScore = institutionDiversity
  const confidenceScore = confidence / Math.max(avgConfidence, 0.01)

  const rawScore = popularity * 0.35 + (1 - alternativeScore) * 0.25 + (1 - institutionScore) * 0.2 + (1 - Math.min(confidenceScore, 1)) * 0.2

  const score = Math.round(rawScore * 100)
  const { level, reason } = classifyCompetition(score, alternativesCount, confidence)

  return { code, level, score, reason }
}

export function evaluateCompetitionForCode(code: string, confidence: number): CompetitionMeter {
  const nctEntry = nctCodes.find((c) => c.code === code)
  return evaluateCompetition({ code, institution: "", cluster: nctEntry?.cluster ?? 1, confidence })
}

function classifyCompetition(
  score: number,
  alternatives: number,
  confidence: number,
): { level: CompetitionLevel; reason: string } {
  if (alternatives < 3 && confidence < 0.5) {
    return {
      level: "risky",
      reason: "Мало альтернатив в кластере, низкая вероятность зачисления",
    }
  }

  if (confidence < 0.4) {
    return {
      level: "risky",
      reason: "Низкая достоверность данных по направлению",
    }
  }

  if (score >= 70) {
    return {
      level: "high",
      reason: "Высокий конкурс. Рекомендуется усиленная подготовка и запасные варианты",
    }
  }

  if (score >= 45) {
    return {
      level: "medium",
      reason: "Умеренный конкурс. Хорошие шансы при качественной подготовке",
    }
  }

  if (score >= 20) {
    return {
      level: "low",
      reason: "Низкий конкурс. Высокая вероятность поступления",
    }
  }

  return {
    level: "backup",
    reason: "Запасной вариант с минимальным конкурсом",
  }
}
