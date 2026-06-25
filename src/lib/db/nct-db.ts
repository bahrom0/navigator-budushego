import type { NewDbRecord, PrefilterParams } from "./types"
import { buildIndexes, type NCTIndexes } from "./indexer"

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
    const keywords = params.interests.map((i) => i.toLowerCase())
    candidates = candidates.filter((r) => {
      const text = `${r.specialty_name} ${r.university_name}`.toLowerCase()
      return keywords.some((kw) => text.includes(kw))
    })
  }

  if (params.query) {
    const q = params.query.toLowerCase()
    candidates = candidates.filter((r) => {
      return (
        r.code.toLowerCase().includes(q) ||
        r.specialty_name.toLowerCase().includes(q) ||
        r.university_name.toLowerCase().includes(q)
      )
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
