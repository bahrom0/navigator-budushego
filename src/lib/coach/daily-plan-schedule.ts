import type { CoachRoadmap, CoachWeek } from "@/types/coach"

function normalizeDate(dateIso: string) {
  return dateIso.slice(0, 10)
}

export function addDays(dateIso: string, days: number): string {
  const date = new Date(`${normalizeDate(dateIso)}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getRoadmapStartDate(roadmap: CoachRoadmap | null | undefined): string | null {
  const raw = roadmap?.generationContext?.startDate
  return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : roadmap?.createdAt
      ? new Date(roadmap.createdAt).toISOString().slice(0, 10)
      : null
}

export function getRoadmapTotalDays(roadmap: CoachRoadmap | null | undefined): number {
  if (!roadmap) return 0
  const weeks = roadmap.durationWeeks ?? roadmap.weeks.length
  return Math.max(weeks, 0) * 7
}

export function getRoadmapEndDate(roadmap: CoachRoadmap | null | undefined): string | null {
  const startDate = getRoadmapStartDate(roadmap)
  const totalDays = getRoadmapTotalDays(roadmap)
  if (!startDate || totalDays <= 0) return null
  return addDays(startDate, totalDays - 1)
}

export function getRoadmapDayOffset(roadmap: CoachRoadmap | null | undefined, dateIso: string): number | null {
  const startDate = getRoadmapStartDate(roadmap)
  if (!startDate) return null
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime()
  const target = new Date(`${normalizeDate(dateIso)}T00:00:00.000Z`).getTime()
  return Math.floor((target - start) / 86400000)
}

export function isDateWithinRoadmap(roadmap: CoachRoadmap | null | undefined, dateIso: string): boolean {
  const offset = getRoadmapDayOffset(roadmap, dateIso)
  if (offset === null) return false
  const totalDays = getRoadmapTotalDays(roadmap)
  return offset >= 0 && offset < totalDays
}

export function getWeekForDate(roadmap: CoachRoadmap, dateIso: string): CoachWeek | null {
  const offset = getRoadmapDayOffset(roadmap, dateIso)
  if (offset === null || roadmap.weeks.length === 0) return null
  const weekIndex = Math.min(Math.floor(offset / 7), roadmap.weeks.length - 1)
  return roadmap.weeks[weekIndex] ?? null
}

export function buildRoadmapDates(roadmap: CoachRoadmap): string[] {
  const startDate = getRoadmapStartDate(roadmap)
  const totalDays = getRoadmapTotalDays(roadmap)
  if (!startDate || totalDays <= 0) return []
  return Array.from({ length: totalDays }, (_, index) => addDays(startDate, index))
}

