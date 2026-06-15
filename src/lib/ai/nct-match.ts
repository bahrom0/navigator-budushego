import nctCodesRaw from "@/data/nct-codes.json"
import type { NCTCode, NCTMatchResult } from "@/types/nct"

const nctCodes: NCTCode[] = nctCodesRaw as NCTCode[]

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^а-яёa-z0-9\s]/g, " ").trim()
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter((w) => w.length > 2)
}

export interface MatchOptions {
  topK?: number
  minScore?: number
}

export function matchNCTByKeywords(
  keywords: string[],
  options: MatchOptions = {},
): NCTMatchResult[] {
  const { topK = 10, minScore = 0.1 } = options
  const keywordTokens = new Set(keywords.flatMap((k) => tokenize(k)))

  const scored: NCTMatchResult[] = nctCodes
    .map((code) => {
      const allText = [
        code.title_ru,
        code.description_plain,
        code.cluster_name_ru,
        ...code.career_matches,
        code.institution,
        code.city,
      ]
        .join(" ")
        .toLowerCase()

      const tokens = new Set(tokenize(allText))

      let matchCount = 0
      const matchedKeywords: string[] = []

      for (const kw of keywordTokens) {
        if (tokens.has(kw)) {
          matchCount++
          matchedKeywords.push(kw)
        }
      }

      const matchScore = keywordTokens.size > 0 ? matchCount / keywordTokens.size : 0

      const confidenceBoost = code.confidence * 0.2

      return {
        code: code.code,
        title_ru: code.title_ru,
        institution: code.institution,
        city: code.city,
        confidence: code.confidence,
        career_matches: code.career_matches,
        matchScore,
        matchedKeywords,
        finalScore: matchScore + confidenceBoost,
      }
    })
    .filter((r) => r.matchScore >= minScore)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK)

  return scored
}

export function matchNCTByCluster(
  categories: { name: string; cluster?: string[] }[],
  options: MatchOptions = {},
): NCTMatchResult[] {
  const { topK = 10, minScore = 0.1 } = options
  const categoryNames = categories.map((c) => c.name).join(" ")

  const clusterKeywordsMap = new Map<
    number,
    { name: string; count: number }
  >()

  const categoryTokens = new Set(tokenize(categoryNames))

  const clusterMapping: Record<string, number> = {
    "естественные и технические науки": 1,
    экономика: 2,
    педагогика: 3,
    медицина: 4,
    искусство: 5,
    "информационные технологии": 1,
    инженерия: 1,
    право: 6,
    гуманитарные: 7,
    лингвистика: 7,
  }

  const categoryClusters = new Set<number>()
  for (const [key, cluster] of Object.entries(clusterMapping)) {
    if (categoryNames.toLowerCase().includes(key)) {
      categoryClusters.add(cluster)
    }
  }

  const scored: NCTMatchResult[] = nctCodes
    .map((code) => {
      const codeKeywords = new Set(tokenize(code.title_ru))
      const codeClusterKeywords = new Set(
        tokenize(code.cluster_name_ru),
      )

      let overlapWithCategory = 0
      for (const token of categoryTokens) {
        if (codeKeywords.has(token)) {
          overlapWithCategory++
        }
      }

      const clusterMatch =
        categoryClusters.size > 0 && categoryClusters.has(code.cluster)
          ? 1
          : 0

      let baseScore = overlapWithCategory / Math.max(categoryTokens.size, 1)
      if (clusterMatch === 1) {
        baseScore += 0.3
      }

      const matchedKeywords: string[] = []
      for (const token of categoryTokens) {
        if (codeKeywords.has(token) || codeClusterKeywords.has(token)) {
          matchedKeywords.push(token)
        }
      }

      const finalScore = Math.min(baseScore + code.confidence * 0.15, 1)

      return {
        code: code.code,
        title_ru: code.title_ru,
        institution: code.institution,
        city: code.city,
        confidence: code.confidence,
        career_matches: code.career_matches,
        matchScore: baseScore,
        matchedKeywords,
        finalScore,
      }
    })
    .filter((r) => r.matchScore >= minScore)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK)

  return scored
}

export { nctCodes }
