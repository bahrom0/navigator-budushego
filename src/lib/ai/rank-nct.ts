import type { NCTMatchResult, RankedNCT } from "@/types/nct"

export interface RankingOptions {
  topK?: number
  minConfidence?: number
  diversify?: boolean
  maxPerCluster?: number
}

function extractCluster(match: NCTMatchResult): number {
  return (match as unknown as Record<string, number>).cluster ?? 0
}

export function rankNCTResults(
  matches: NCTMatchResult[],
  options: RankingOptions = {},
): RankedNCT[] {
  const {
    topK = 8,
    minConfidence = 0.5,
    diversify = true,
    maxPerCluster = 2,
  } = options

  let filtered = matches.filter((m) => m.confidence >= minConfidence)

  if (diversify && filtered.length > 1) {
    filtered = diversifyByCluster(filtered, maxPerCluster)
  }

  const ranked: RankedNCT[] = filtered
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK)
    .map((match, index) => ({
      ...match,
      rank: index + 1,
      finalScore: match.finalScore,
      reasoning: buildReasoning(match, index),
    }))

  return ranked
}

function diversifyByCluster(
  matches: NCTMatchResult[],
  maxPerCluster: number,
): NCTMatchResult[] {
  const clusterCount = new Map<number, number>()
  const result: NCTMatchResult[] = []

  for (const match of matches) {
    const cluster = extractCluster(match)
    const count = clusterCount.get(cluster) ?? 0

    if (count < maxPerCluster) {
      result.push(match)
      clusterCount.set(cluster, count + 1)
    }
  }

  return result
}

function buildReasoning(match: NCTMatchResult, rank: number): string {
  if (rank === 0) {
    return `Наилучшее совпадение: ${match.matchedKeywords.length} ключевых слов из ваших интересов, степень уверенности ${(match.confidence * 100).toFixed(0)}%`
  }

  const keywordCount = match.matchedKeywords.length
  if (keywordCount > 0) {
    return `Совпадение по ${keywordCount} ключевым словам; ${match.career_matches.slice(0, 2).join(", ")}`
  }

  return `Уровень уверенности ${(match.confidence * 100).toFixed(0)}%`
}

export function getTopMatchesByCluster(
  ranked: RankedNCT[],
  topPerCluster: number = 2,
): Map<number, RankedNCT[]> {
  const grouped = new Map<number, RankedNCT[]>()

  for (const item of ranked) {
    const cluster = extractCluster(item)
    const list = grouped.get(cluster) ?? []
    if (list.length < topPerCluster) {
      list.push(item)
      grouped.set(cluster, list)
    }
  }

  return grouped
}

export function calculateOverallConfidence(ranked: RankedNCT[]): number {
  if (ranked.length === 0) return 0
  const avg = ranked.reduce((sum, r) => sum + r.confidence, 0) / ranked.length
  const topBonus = ranked[0].finalScore > 0.7 ? 0.1 : 0
  return Math.min(avg + topBonus, 1)
}
