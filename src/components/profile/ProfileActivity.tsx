"use client"

import { useProfileStore } from "@/stores/profile-store"
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap"
import { isPriorityActivityEventType } from "@/types/activity"

export function ProfileActivity() {
  const activityLog = useProfileStore((s) => s.activityLog)
  const recent = activityLog.filter((event) =>
    typeof event.isPriority === "boolean"
      ? event.isPriority
      : isPriorityActivityEventType(event.type),
  ).slice(0, 10)

  return (
    <div className="flex flex-col gap-3">
      <ActivityHeatmap />
      {recent.length > 0 && (
        <div className="rounded-[16px] border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            Последние действия
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-[12px] bg-card-bg px-3 py-2">
                <span className="text-sm text-foreground">{event.label}</span>
                <span className="text-xs text-text-muted">
                  {new Date(event.timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
