import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"
import type { ActivityEventType } from "@/types/activity"
import type { CoachSubjectLevel } from "@/types/coach"
import type { UserLevel } from "@/types/profile"

function getHighestLevel(subjects: CoachSubjectLevel[]): UserLevel {
  const rank: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }
  let best: UserLevel = "beginner"
  let bestRank = 0
  for (const s of subjects) {
    const r = rank[s.level] ?? 0
    if (r > bestRank) {
      bestRank = r
      best = s.level
    }
  }
  return best
}

export function logCoachActivity(type: ActivityEventType, customLabel?: string): void {
  logActivityEvent(type, customLabel)
}

export function syncCoachLevel(subjects: CoachSubjectLevel[]): void {
  if (!subjects.length) return
  const level = getHighestLevel(subjects)
  const profile = useProfileStore.getState()
  const rank: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }
  if ((rank[level] ?? 0) > (rank[profile.level] ?? 0)) {
    profile.setLevel(level)
  }
}
