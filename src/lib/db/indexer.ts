import type { NewDbRecord } from "./types"

export interface NCTIndexes {
  byCode: Map<string, NewDbRecord[]>
  byLocation: Map<string, NewDbRecord[]>
  byEducationLevel: Map<string, NewDbRecord[]>
  byCluster: Map<number, NewDbRecord[]>
  bySpecialtyName: Map<string, NewDbRecord[]>
  byUniversityName: Map<string, NewDbRecord[]>
}

function normalizeCityForIndex(city: string): string {
  return (city ?? "").replace(/^город\s*/i, "").trim().toLowerCase()
}

export function buildIndexes(records: NewDbRecord[]): NCTIndexes {
  const byCode = new Map<string, NewDbRecord[]>()
  const byLocation = new Map<string, NewDbRecord[]>()
  const byEducationLevel = new Map<string, NewDbRecord[]>()
  const byCluster = new Map<number, NewDbRecord[]>()
  const bySpecialtyName = new Map<string, NewDbRecord[]>()
  const byUniversityName = new Map<string, NewDbRecord[]>()

  for (const record of records) {
    appendToMap(byCode, record.code, record)
    appendToMap(byLocation, normalizeCityForIndex(record.location), record)
    appendToMap(byEducationLevel, record.education_level, record)
    appendToMap(byCluster, record.cluster, record)
    appendToMap(bySpecialtyName, record.specialty_name.toLowerCase(), record)
    appendToMap(byUniversityName, record.university_name.toLowerCase(), record)
  }

  return { byCode, byLocation, byEducationLevel, byCluster, bySpecialtyName, byUniversityName }
}

function appendToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key)
  if (existing) {
    existing.push(value)
  } else {
    map.set(key, [value])
  }
}
