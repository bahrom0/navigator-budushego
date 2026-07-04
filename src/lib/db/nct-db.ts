import type { NewDbRecord, PrefilterParams } from "./types"
import { buildIndexes, type NCTIndexes } from "./indexer"
import { CLUSTER_NAMES } from "./types"
import { tokenize, uniqueTokens } from "@/lib/search/normalize"

let _records: NewDbRecord[] | null = null
let _indexes: NCTIndexes | null = null

function normalizeCity(city: string): string {
  return (city ?? "").replace(/^город\s*/i, "").trim()
}

function cityMatch(recordCity: string, queryCity: string): boolean {
  const normalized = normalizeCity(recordCity).toLowerCase()
  const query = queryCity.toLowerCase()
  return normalized === query || normalized.includes(query) || query.includes(normalized)
}

function buildRecordTokens(record: NewDbRecord): Set<string> {
  return new Set(
    tokenize(
      [
        record.code,
        record.specialty_name,
        record.university_name,
        record.location,
        CLUSTER_NAMES[record.cluster] ?? "",
      ]
        .filter(Boolean)
        .join(" "),
    ),
  )
}

function tokenOverlap(recordTokens: Set<string>, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true

  for (const queryToken of queryTokens) {
    for (const recordToken of recordTokens) {
      if (recordToken === queryToken) return true
      if (recordToken.startsWith(queryToken) || queryToken.startsWith(recordToken)) {
        return true
      }
    }
  }

  return false
}

export async function loadDatabase(): Promise<NewDbRecord[]> {
  if (_records) return _records
  const data = await import("@/data/new_db.json")
  _records = (data as { records: NewDbRecord[] }).records
  return _records
}

export async function getIndexes(): Promise<NCTIndexes> {
  if (_indexes) return _indexes
  const records = await loadDatabase()
  _indexes = buildIndexes(records)
  return _indexes
}

export async function prefilter(params: PrefilterParams): Promise<NewDbRecord[]> {
  const records = await loadDatabase()
  const indexes = await getIndexes()

  let candidates = records

  if (params.educationLevel) {
    const levelRecords = indexes.byEducationLevel.get(params.educationLevel)
    candidates = levelRecords ?? []
  }

  if (params.studyCity) {
    const cityRecords = indexes.byLocation.get(normalizeCity(params.studyCity).toLowerCase())
    if (cityRecords) {
      candidates = candidates.filter((r) => cityMatch(r.location, params.studyCity!))
    }
  }

  if (params.clusters && params.clusters.length > 0) {
    const clusterSet = new Set(params.clusters)
    candidates = candidates.filter((r) => clusterSet.has(r.cluster))
  }

  if (params.interests && params.interests.length > 0) {
    const keywords = uniqueTokens(params.interests.flatMap((interest) => tokenize(interest)))
    candidates = candidates.filter((r) => {
      return tokenOverlap(buildRecordTokens(r), keywords)
    })
  }

  if (params.query) {
    const queryTokens = uniqueTokens(tokenize(params.query))
    candidates = candidates.filter((r) => {
      if (normalizeTextForQuery(r.code).includes(normalizeTextForQuery(params.query ?? ""))) {
        return true
      }
      return tokenOverlap(buildRecordTokens(r), queryTokens)
    })
  }

  return candidates
}

export function getByCode(code: string): NewDbRecord[] {
  if (!_indexes) return []
  return _indexes.byCode.get(code) ?? []
}

export function getByCluster(cluster: number): NewDbRecord[] {
  if (!_indexes) return []
  return _indexes.byCluster.get(cluster) ?? []
}

export function getByLocation(city: string): NewDbRecord[] {
  if (!_indexes) return []
  return _indexes.byLocation.get(normalizeCity(city).toLowerCase()) ?? []
}

export function getRecords(): NewDbRecord[] {
  return _records ?? []
}

function normalizeTextForQuery(value: string): string {
  return (value ?? "").toLowerCase().replace(/[^a-zа-я0-9.]+/gi, "")
}
