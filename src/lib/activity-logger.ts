import { useProfileStore } from "@/stores/profile-store"
import type { ActivityEventType } from "@/types/activity"
import { ACTIVITY_EVENT_LABELS, isPriorityActivityEventType } from "@/types/activity"
import { checkAndUnlockAchievements } from "@/features/achievements"

export function logActivityEvent(type: ActivityEventType, customLabel?: string): void {
  const label = customLabel ?? ACTIVITY_EVENT_LABELS[type] ?? type
  useProfileStore.getState().logActivity(type, label, isPriorityActivityEventType(type))
  checkAndUnlockAchievements()
}
