"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, Flame, Eye } from "lucide-react"
import { useProfileStore } from "@/stores/profile-store"
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap"
import { ACTIVITY_EVENT_LABELS, type ActivityEventType } from "@/types/activity"
import { isPriorityActivityEventType } from "@/types/activity"

function formatGroupDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const day = 86400000

  if (diff < day) return "Сегодня"
  if (diff < 2 * day) return "Вчера"
  if (diff < 7 * day) return "На этой неделе"
  if (diff < 30 * day) return "В этом месяце"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

function groupByDate(events: { timestamp: number }[]): Map<string, { timestamp: number }[]> {
  const groups = new Map<string, { timestamp: number }[]>()
  for (const event of events) {
    const label = formatGroupDate(event.timestamp)
    const list = groups.get(label) || []
    list.push(event)
    groups.set(label, list)
  }
  return groups
}

export default function DashboardActivity() {
  const activityLog = useProfileStore((s) => s.activityLog)
  const [search, setSearch] = useState("")
  const [mounted, setMounted] = useState(false)
  const priorityActivityLog = useMemo(
    () =>
      activityLog.filter((event) =>
        typeof event.isPriority === "boolean"
          ? event.isPriority
          : isPriorityActivityEventType(event.type),
    ),
    [activityLog],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return priorityActivityLog
    return priorityActivityLog.filter(
      (e) => e.label.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    )
  }, [priorityActivityLog, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Активность</h1>
          <p className="mt-1 text-sm text-text-secondary">
          {!mounted
            ? "История действий"
            : priorityActivityLog.length === 0
            ? "История действий пуста"
            : `${priorityActivityLog.length} действий`}
        </p>
      </motion.div>

      <div className="mt-6">
        {mounted ? <ActivityHeatmap large /> : null}
      </div>

      {mounted && priorityActivityLog.length > 0 && (
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по событиям..."
              className="h-10 w-full rounded-[12px] border border-border bg-card-bg pl-9 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {mounted && priorityActivityLog.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Активность пока пуста</p>
          <p className="mt-1 text-sm text-text-secondary">
            Все ваши действия будут отображаться здесь.
          </p>
        </motion.div>
      )}

      {mounted && filtered.length === 0 && priorityActivityLog.length > 0 && (
        <div className="mt-8 rounded-[18px] border border-border bg-background p-8 text-center">
          <p className="text-sm text-text-muted">Ничего не найдено. Попробуйте изменить запрос.</p>
        </div>
      )}

      <div className="mt-6 space-y-8">
        {Array.from(grouped.entries()).map(([dateLabel, events]) => (
          <div key={dateLabel}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {dateLabel}
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {(events as typeof filtered).map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card-bg px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Eye className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.label}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(event.timestamp).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-text-muted border border-border">
                      {ACTIVITY_EVENT_LABELS[event.type as ActivityEventType] || event.type}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
