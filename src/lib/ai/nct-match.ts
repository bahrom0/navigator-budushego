import newDbRaw from "@/data/new_db.json"
import { CLUSTER_NAMES, type NewDbRecord, type PrefilterParams } from "@/lib/db/types"
import { searchSpecialtiesAsMatches } from "@/lib/search/engine"
import type {
  SearchCategoryInput,
  SearchFilters,
  SearchInput,
} from "@/lib/search/types"
import { uniqueTokens } from "@/lib/search/normalize"
import type { NCTCode, NCTMatchResult } from "@/types/nct"

export interface MatchOptions {
  topK?: number
  minScore?: number
  query?: string
  keywords?: string[]
  filters?: SearchFilters
}

export interface PrefilterOptions extends PrefilterParams {
  categoryNames: string[]
}

export interface LegacyCategoryInput {
  id?: string
  name: string
  description?: string
  cluster?: string[]
}

const DEFAULT_TOP_K = 10

function buildLegacyNctCode(record: NewDbRecord): NCTCode {
  return {
    code: record.code ?? "",
    title_ru: record.specialty_name ?? "",
    cluster: record.cluster ?? 0,
    cluster_name_ru: clusterNameForRecord(record),
    level_allowed: record.education_level ? [record.education_level] : [],
    institution: record.university_name ?? "",
    city: normalizeLegacyCity(record.location),
    study_form: record.education_form ? [record.education_form] : [],
    study_type: record.education_type ? [record.education_type] : [],
    languages: record.language ? [record.language] : [],
    exams_required: [],
    restrictions: [],
    description_plain: `${record.specialty_name ?? ""} — ${record.university_name ?? ""}`,
    career_matches: [clusterNameForRecord(record)],
    source: { type: "new_db", url: "", page: record.source_page ?? 0 },
    confidence: 0.7,
    last_verified_at: "",
    academic_year: "2025/2026",
  }
}

function clusterNameForRecord(record: NewDbRecord): string {
  return CLUSTER_NAMES[record.cluster] ?? "Другое"
}

function normalizeLegacyCity(city: string): string {
  return (city ?? "").replace(/^город\s*/i, "").trim()
}

function toSearchCategories(categories: LegacyCategoryInput[]): SearchCategoryInput[] {
  return categories.map((category, index) => ({
    id: category.id ?? `category-${index}`,
    name: category.name,
    description: category.description,
  }))
}

function toSearchFilters(
  prefilter?: PrefilterOptions,
  filters?: SearchFilters,
): SearchFilters | undefined {
  const city = uniqueTokens([
    ...(prefilter?.studyCity ? [prefilter.studyCity] : []),
    ...(filters?.city ?? []),
  ])

  const educationLevel = uniqueTokens([
    ...(prefilter?.educationLevel ? [prefilter.educationLevel] : []),
    ...(filters?.educationLevel ?? []),
  ]) as Array<"after_9" | "after_11">

  const studyForm = uniqueTokens(filters?.studyForm ?? [])
  const studyType = uniqueTokens(filters?.studyType ?? [])

  const clusterIds = uniqueNumbers([
    ...(prefilter?.clusters ?? []),
    ...(filters?.clusterIds ?? []),
  ])

  const result: SearchFilters = {}
  if (city.length > 0) result.city = city
  if (educationLevel.length > 0) result.educationLevel = educationLevel
  if (studyForm.length > 0) result.studyForm = studyForm
  if (studyType.length > 0) result.studyType = studyType
  if (clusterIds.length > 0) result.clusterIds = clusterIds

  return Object.keys(result).length > 0 ? result : undefined
}

function buildSearchInput(
  categories: LegacyCategoryInput[],
  options: MatchOptions & { prefilter?: PrefilterOptions } = {},
): SearchInput {
  const prefilter = options.prefilter
  const categoryInputs = toSearchCategories(categories)
  const query = (options.query ?? prefilter?.query ?? "").trim()

  const keywords = uniqueTokens([
    ...(options.keywords ?? []),
    ...(prefilter?.interests ?? []),
    ...(prefilter?.categoryNames ?? []),
  ])

  const searchInput: SearchInput = {
    query: query.length > 0 ? query : undefined,
    categories: categoryInputs,
    keywords: keywords.length > 0 ? keywords : undefined,
    filters: toSearchFilters(prefilter, options.filters),
    topK: options.topK ?? DEFAULT_TOP_K,
    minScore: options.minScore ?? 0.1,
    diversify: false,
    maxPerBranch: 2,
  }

  return searchInput
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value)))]
}

function limitMatches(matches: NCTMatchResult[], topK: number): NCTMatchResult[] {
  return matches.slice(0, Math.max(1, topK))
}

export async function matchNCTByCluster(
  categories: LegacyCategoryInput[],
  options: MatchOptions & { prefilter?: PrefilterOptions } = {},
): Promise<NCTMatchResult[]> {
  const searchInput = buildSearchInput(categories, options)
  const matches = await searchSpecialtiesAsMatches(searchInput)
  return limitMatches(matches, options.topK ?? DEFAULT_TOP_K)
}

export async function matchNCTByKeywords(
  keywords: string[],
  options: MatchOptions & { prefilter?: PrefilterOptions } = {},
): Promise<NCTMatchResult[]> {
  const searchInput = buildSearchInput([], {
    ...options,
    query: (options.query ?? keywords.join(" ")).trim(),
    keywords,
  })
  const matches = await searchSpecialtiesAsMatches(searchInput)
  return limitMatches(matches, options.topK ?? DEFAULT_TOP_K)
}

const nctCodes: NCTCode[] = (newDbRaw as { records: NewDbRecord[] }).records.map(
  buildLegacyNctCode,
)

export { nctCodes }
