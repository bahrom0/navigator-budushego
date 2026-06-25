import type { NCTCode, NCTMatchResult } from "@/types/nct"
import type { NewDbRecord, PrefilterParams } from "@/lib/db/types"
import { prefilter, loadDatabase } from "@/lib/db/nct-db"
import { CLUSTER_NAMES } from "@/lib/db/types"

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^а-яёa-z0-9\s]/g, " ").trim()
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter((w) => w.length > 1)
}

function wordMatch(textTokens: Set<string>, queryToken: string): boolean {
  for (const t of textTokens) {
    if (t.includes(queryToken) || queryToken.includes(t)) return true
  }
  return false
}

function scoreByTokenOverlap(textTokens: Set<string>, queryTokens: Set<string>): { overlap: number; matched: string[] } {
  let overlap = 0
  const matched: string[] = []
  for (const qt of queryTokens) {
    if (wordMatch(textTokens, qt)) {
      overlap++
      matched.push(qt)
    }
  }
  return { overlap, matched }
}

function recordToMatchResult(record: NewDbRecord, matchScore: number, matchedKeywords: string[], finalScore: number): NCTMatchResult {
  return {
    code: record.code ?? "",
    title_ru: record.specialty_name ?? "",
    institution: record.university_name ?? "",
    city: (record.location ?? "").replace(/^город\s*/i, ""),
    confidence: Math.min(0.5 + matchScore * 0.5, 1),
    career_matches: [CLUSTER_NAMES[record.cluster] ?? "Другое"],
    matchScore,
    matchedKeywords,
    finalScore,
    cluster: record.cluster,
    cluster_name_ru: CLUSTER_NAMES[record.cluster] ?? "Другое",
    study_form: record.education_form ? [record.education_form] : [],
    study_type: record.education_type ? [record.education_type] : [],
  }
}

export interface MatchOptions {
  topK?: number
  minScore?: number
}

export interface PrefilterOptions extends PrefilterParams {
  categoryNames: string[]
}

function scoreRecord(record: NewDbRecord, queryTokens: Set<string>): { matchScore: number; matchedKeywords: string[]; finalScore: number } {
  const textTokens = new Set(tokenize(`${record.specialty_name} ${record.university_name} ${CLUSTER_NAMES[record.cluster] ?? ""}`))
  const { overlap, matched } = scoreByTokenOverlap(textTokens, queryTokens)
  const matchScore = queryTokens.size > 0 ? overlap / queryTokens.size : 0
  const boost = record.admission_plan > 0 ? 0.05 : 0
  const finalScore = Math.min(matchScore + boost, 1)
  return { matchScore, matchedKeywords: matched, finalScore }
}

async function tryMatch(candidates: NewDbRecord[], queryTokens: Set<string>, topK: number, minScore: number): Promise<NCTMatchResult[]> {
  return candidates
    .map((record) => {
      const { matchScore, matchedKeywords, finalScore } = scoreRecord(record, queryTokens)
      return recordToMatchResult(record, matchScore, matchedKeywords, finalScore)
    })
    .filter((r) => r.matchScore >= minScore)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK)
}

export async function matchNCTByCluster(
  categories: { name: string; cluster?: string[] }[],
  options: MatchOptions & { prefilter?: PrefilterOptions } = {},
): Promise<NCTMatchResult[]> {
  const { topK = 10, minScore = 0.1, prefilter: pf } = options
  const categoryNames = categories.map((c) => c.name).join(" ")
  const categoryTokens = new Set(tokenize(categoryNames))

  const allRecords = await loadDatabase()

  let candidates = allRecords

  if (pf) {
    const filtered = await prefilter({
      educationLevel: pf.educationLevel,
      studyCity: pf.studyCity,
      clusters: pf.clusters,
      interests: pf.interests,
    })

    const filteredResults = await tryMatch(filtered, categoryTokens, topK, minScore)

    if (filteredResults.length >= 3) {
      return filteredResults
    }

    const unfilteredResults = await tryMatch(allRecords, categoryTokens, topK, minScore)
    const merged = [...filteredResults]
    const seen = new Set(merged.map((r) => r.code + r.institution))
    for (const r of unfilteredResults) {
      const key = r.code + r.institution
      if (!seen.has(key)) {
        merged.push(r)
        seen.add(key)
      }
    }
    return merged.slice(0, topK)
  }

  return tryMatch(allRecords, categoryTokens, topK, minScore)
}

import newDbRaw from "@/data/new_db.json"
import type { NewDbDatabase } from "@/lib/db/types"

function buildLegacyNctCode(record: NewDbRecord): NCTCode {
  return {
    code: record.code ?? "",
    title_ru: record.specialty_name ?? "",
    cluster: record.cluster ?? 0,
    cluster_name_ru: CLUSTER_NAMES[record.cluster] ?? "Другое",
    level_allowed: record.education_level ? [record.education_level] : [],
    institution: record.university_name ?? "",
    city: (record.location ?? "").replace(/^город\s*/i, ""),
    study_form: record.education_form ? [record.education_form] : [],
    study_type: record.education_type ? [record.education_type] : [],
    languages: record.language ? [record.language] : [],
    exams_required: [],
    restrictions: [],
    description_plain: `${record.specialty_name ?? ""} — ${record.university_name ?? ""}`,
    career_matches: [CLUSTER_NAMES[record.cluster] ?? "Другое"],
    source: { type: "new_db", url: "", page: record.source_page ?? 0 },
    confidence: 0.7,
    last_verified_at: "",
    academic_year: "2025/2026",
  }
}

const nctCodes: NCTCode[] = (newDbRaw as NewDbDatabase).records.map(buildLegacyNctCode)
export { nctCodes }

export async function matchNCTByKeywords(
  keywords: string[],
  options: MatchOptions & { prefilter?: PrefilterOptions } = {},
): Promise<NCTMatchResult[]> {
  const { topK = 10, minScore = 0.1, prefilter: pf } = options
  const keywordTokens = new Set(keywords.flatMap((k) => tokenize(k)))

  const allRecords = await loadDatabase()

  let candidates = allRecords

  if (pf) {
    const filtered = await prefilter({
      educationLevel: pf.educationLevel,
      studyCity: pf.studyCity,
      clusters: pf.clusters,
      interests: pf.interests,
    })

    const filteredResults = await tryMatch(filtered, keywordTokens, topK, minScore)

    if (filteredResults.length >= 3) {
      return filteredResults
    }

    const unfilteredResults = await tryMatch(allRecords, keywordTokens, topK, minScore)
    const merged = [...filteredResults]
    const seen = new Set(merged.map((r) => r.code + r.institution))
    for (const r of unfilteredResults) {
      const key = r.code + r.institution
      if (!seen.has(key)) {
        merged.push(r)
        seen.add(key)
      }
    }
    return merged.slice(0, topK)
  }

  return tryMatch(allRecords, keywordTokens, topK, minScore)
}
