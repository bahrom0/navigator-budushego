"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Search, Eye, Bookmark, Mic, Sparkles, Target, CheckCircle2, Play, BarChart3, User, MessageSquare,
} from "lucide-react"
import { useProfileStore } from "@/stores/profile-store"
import { ACTIVITY_EVENT_LABELS, type ActivityEventType } from "@/types/activity"

const EVENT_ICONS: Record<string, typeof Eye> = {
  open_app: Play,
  choose_category: Target,
  start_analysis: BarChart3,
  view_recommendation: Eye,
  bookmark_code: Bookmark,
  open_profile: User,
  start_interview: Mic,
  finish_interview: CheckCircle2,
  generate_plan: Sparkles,
  save_plan: Bookmark,
  complete_plan_step: CheckCircle2,
  use_teacher: MessageSquare,
}

const EVENT_LINKS: Record<string, string> = {
  view_recommendation: "/recommendations",
  choose_category: "/categories",
  start_interview: "/interview",
  finish_interview: "/interview",
  generate_plan: "/plan",
  save_plan: "/plan",
  bookmark_code: "/dashboard/bookmarks",
  use_teacher: "/teacher",
}

function formatDateLabel(timestamp: number): string {
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
    const label = formatDateLabel(event.timestamp)
    const list = groups.get(label) || []
    list.push(event)
    groups.set(label, list)
  }
  return groups
}

export default function DashboardHistory() {
  const router = useRouter()
  const activityLog = useProfileStore((s) => s.activityLog)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return activityLog
    return activityLog.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    )
  }, [activityLog, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const handleEventClick = (event: (typeof activityLog)[0]) => {
    const link = EVENT_LINKS[event.type]
    if (link) router.push(link)
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">История</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {activityLog.length === 0
            ? "История действий пуста"
            : `${activityLog.length} действий`}
        </p>
      </motion.div>

      {activityLog.length > 0 && (
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

      {activityLog.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">История пока пуста</p>
          <p className="mt-1 text-sm text-text-secondary">
            Все ваши действия будут отображаться здесь.
          </p>
        </motion.div>
      )}

      {filtered.length === 0 && activityLog.length > 0 && (
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
              {(events as typeof filtered).map((event, i) => {
                const Icon = EVENT_ICONS[event.type] || Eye
                const link = EVENT_LINKS[event.type]
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <button
                      onClick={() => handleEventClick(event)}
                      className={`flex w-full items-center gap-3 rounded-[14px] border border-border bg-card-bg px-4 py-3 text-left transition-colors hover:bg-background ${link ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {event.label}
                        </p>
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
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
