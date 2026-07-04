"use client"

import { useEffect, useState } from "react"
import { useProfileStore } from "@/stores/profile-store"
import { Target, Bookmark, FileText, ClipboardList } from "lucide-react"
import { isPriorityActivityEventType } from "@/types/activity"

export function ProfileStats() {
  const level = useProfileStore((s) => s.level)
  const analyses = useProfileStore((s) => s.recommendations.length)
  const bookmarks = useProfileStore((s) => s.bookmarks.length)
  const plans = useProfileStore((s) => s.plans.length)
  const interviews = useProfileStore((s) => s.interviews.length)
  const activityLog = useProfileStore((s) => s.activityLog)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const streak = activityLog.filter((event) =>
    typeof event.isPriority === "boolean"
      ? event.isPriority
      : isPriorityActivityEventType(event.type),
  ).length

  const items = [
    { label: "Анализов", value: analyses, icon: FileText },
    { label: "Закладок", value: bookmarks, icon: Bookmark },
    { label: "Планов", value: plans, icon: ClipboardList },
    { label: "Активность", value: mounted ? streak : 0, icon: Target },
  ]

  return (
    <div className="rounded-[16px] border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Статистика</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {level}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 rounded-[12px] bg-card-bg p-3">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-text-muted">Интервью:</span>
        <span className="text-xs font-semibold text-foreground">{interviews}</span>
      </div>
    </div>
  )
}
