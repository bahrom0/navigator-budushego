"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Search, CheckCircle2, Flag, GitBranch, CalendarDays, ArrowRight } from "lucide-react"
import { applyActiveGoalBundle } from "@/lib/coach/bundle-client"
import { fetchActiveGoalBundle } from "@/lib/active-goal-bundle-client"
import type { ActiveGoalBundle, ProductHistoryRecord } from "@/types/admission"

const ACTION_LINKS: Record<string, string> = {
  goal_selected: "/plan",
  general_plan_generated: "/plan",
  general_plan_updated: "/plan",
  roadmap_created: "/coach",
  roadmap_updated: "/coach",
  daily_plan_generated: "/coach",
  coach_task_completed: "/coach",
  coach_day_completed: "/coach",
}

const ACTION_ICONS = {
  goal: Flag,
  plan: GitBranch,
  roadmap: GitBranch,
  daily_plan: CalendarDays,
  task: CheckCircle2,
} as const

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

function groupByDate(events: ProductHistoryRecord[]): Map<string, ProductHistoryRecord[]> {
  const groups = new Map<string, ProductHistoryRecord[]>()
  for (const event of events) {
    const label = formatDateLabel(event.occurredAt)
    const list = groups.get(label) ?? []
    list.push(event)
    groups.set(label, list)
  }
  return groups
}

export default function DashboardHistory() {
  const [bundle, setBundle] = useState<ActiveGoalBundle | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const nextBundle = await fetchActiveGoalBundle()
        if (cancelled) return
        setBundle(nextBundle)
        if (nextBundle) {
          applyActiveGoalBundle(nextBundle)
        }
      } catch {
        if (!cancelled) {
          setBundle(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const history = bundle?.history ?? []
    const query = search.toLowerCase().trim()
    if (!query) return history
    return history.filter((item) =>
      item.title.toLowerCase().includes(query)
      || item.action.toLowerCase().includes(query)
      || (item.summary ?? "").toLowerCase().includes(query),
    )
  }, [bundle, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">History</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Здесь собраны реальные решения и прогресс по активной цели, а не просто telemetry-клики.
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-8 rounded-[18px] border border-border bg-card-bg p-8 text-sm text-text-muted">
          Загружаем историю цели...
        </div>
      ) : null}

      {!loading && !bundle?.goal ? (
        <div className="mt-8 rounded-[18px] border border-border bg-card-bg p-8">
          <p className="text-sm font-medium text-foreground">Активная цель пока не выбрана</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            History начинает работать после выбора цели и первых шагов по плану.
          </p>
          <Link
            href="/recommendations"
            className="mt-4 inline-flex items-center gap-2 rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Перейти к рекомендациям
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {!loading && bundle?.goal ? (
        <>
          <div className="mt-6 rounded-[18px] border border-border bg-card-bg p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Активная цель</p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{bundle.goal.nctTitle}</h2>
                <p className="mt-1 text-sm text-text-secondary">{bundle.goal.nctCode}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[14px] bg-background px-4 py-3">
                  <p className="text-xs text-text-muted">События</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{bundle.historySummary.productEventsTracked ?? 0}</p>
                </div>
                <div className="rounded-[14px] bg-background px-4 py-3">
                  <p className="text-xs text-text-muted">Дней в Coach</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{bundle.historySummary.daysTracked}</p>
                </div>
                <div className="rounded-[14px] bg-background px-4 py-3">
                  <p className="text-xs text-text-muted">Задач выполнено</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{bundle.historySummary.tasksCompleted}</p>
                </div>
              </div>
            </div>

            {(bundle.history?.length ?? 0) > 0 ? (
              <div className="mt-5 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по решениям и прогрессу..."
                  className="h-10 w-full rounded-[12px] border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ) : null}
          </div>

          {bundle.history.length === 0 ? (
            <div className="mt-8 rounded-[18px] border border-border bg-background p-10 text-center">
              <p className="text-sm font-medium text-foreground">История еще не наполнена</p>
              <p className="mt-2 text-sm text-text-secondary">
                Как только вы соберете план, roadmap и начнете закрывать шаги в Coach, они появятся здесь.
              </p>
            </div>
          ) : null}

          {bundle.history.length > 0 && filtered.length === 0 ? (
            <div className="mt-8 rounded-[18px] border border-border bg-background p-8 text-center">
              <p className="text-sm text-text-muted">Ничего не найдено. Попробуйте изменить запрос.</p>
            </div>
          ) : null}

          <div className="mt-6 space-y-8">
            {Array.from(grouped.entries()).map(([dateLabel, events]) => (
              <div key={dateLabel}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{dateLabel}</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {events.map((event, index) => {
                    const Icon = ACTION_ICONS[event.entityType as keyof typeof ACTION_ICONS] ?? CheckCircle2
                    const href = ACTION_LINKS[event.action]
                    const content = (
                      <div className="flex items-start gap-3 rounded-[14px] border border-border bg-card-bg px-4 py-3 transition-colors hover:bg-background">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <p className="mt-1 text-xs leading-5 text-text-secondary">
                            {event.summary ?? "Значимое событие по активной цели"}
                          </p>
                          <p className="mt-1 text-[11px] text-text-muted">
                            {new Date(event.occurredAt).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        {href ? <Link href={href}>{content}</Link> : content}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
