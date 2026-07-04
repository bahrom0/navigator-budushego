"use client"

import { useMemo, useState } from "react"
import { useProfileStore } from "@/stores/profile-store"
import { Flame } from "lucide-react"
import { isPriorityActivityEventType } from "@/types/activity"

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const MONTH_LABELS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
const TOTAL_WEEKS = 12

interface DayCell {
  date: Date
  count: number
}

function groupByDate(events: { timestamp: number }[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const e of events) {
    const key = new Date(e.timestamp).toISOString().slice(0, 10)
    map[key] = (map[key] || 0) + 1
  }
  return map
}

function buildWeeks(activityLog: { timestamp: number }[]): DayCell[][] {
  const grouped = groupByDate(activityLog)
  const today = new Date()
  const monday = new Date(today)
  const dayOfWeek = monday.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(monday.getDate() + diffToMonday)

  const start = new Date(monday)
  start.setDate(start.getDate() - (TOTAL_WEEKS - 1) * 7)

  const weeks: DayCell[][] = []
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      const key = date.toISOString().slice(0, 10)
      week.push({ date, count: grouped[key] || 0 })
    }
    weeks.push(week)
  }
  return weeks
}

const LEVELS = [
  { min: 0, max: 0, bg: "bg-primary/5" },
  { min: 1, max: 2, bg: "bg-success/25" },
  { min: 3, max: 5, bg: "bg-success/50" },
  { min: 6, max: Infinity, bg: "bg-success" },
]

function cellClass(count: number): string {
  for (const level of LEVELS) {
    if (count >= level.min && count <= level.max) return level.bg
  }
  return "bg-primary/5"
}

interface ActivityHeatmapProps {
  large?: boolean
}

export function ActivityHeatmap({ large = false }: ActivityHeatmapProps) {
  const activityLog = useProfileStore((s) => s.activityLog)
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null)
  const priorityLog = useMemo(
    () =>
      activityLog.filter((event) =>
        typeof event.isPriority === "boolean"
          ? event.isPriority
          : isPriorityActivityEventType(event.type),
      ),
    [activityLog],
  )

  const weeks = useMemo(() => buildWeeks(priorityLog), [priorityLog])

  const totalActions = priorityLog.length
  const uniqueDays = new Set(
    priorityLog.map((e) => new Date(e.timestamp).toISOString().slice(0, 10))
  ).size

  const cellSize = large ? "h-5 w-5 lg:h-7 lg:w-7" : "h-3 w-3"
  const gap = large ? "gap-1 lg:gap-1.5" : "gap-0.5"
  const labelW = large ? "w-10 lg:w-12" : "w-8"
  const labelSize = large ? "text-[11px] lg:text-xs" : "text-[9px]"
  const monthW = large ? "w-5 lg:w-7" : "w-3"
  const monthSize = large ? "text-[10px] lg:text-xs" : "text-[9px]"
  const rounded = large ? "rounded-[4px] lg:rounded-[6px]" : "rounded-[3px]"
  const legendSize = large ? "h-4 w-4 lg:h-5 lg:w-5" : "h-3 w-3"
  const legendRounded = large ? "rounded-[4px]" : "rounded-[3px]"

  if (totalActions === 0) {
    return (
      <div className="rounded-[16px] border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame className="h-4 w-4 text-warning" />
          Активность
        </div>
        <p className="text-sm text-text-muted">
          Пока нет действий. Начните с выбора направлений.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-border bg-background p-4 lg:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame className="h-4 w-4 text-warning" />
          Активность
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{totalActions} действий</span>
          <span>{uniqueDays} дней</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={`inline-flex flex-col ${gap}`}>
          <div className="mb-1 flex">
            <div className={`${labelW} shrink-0`} />
            {weeks.map((_, wi) => {
              const month = weeks[wi][0].date.getMonth()
              const prevMonth = wi > 0 ? weeks[wi - 1][0].date.getMonth() : -1
              if (wi === 0 || month !== prevMonth) {
                return (
                  <span key={wi} className={`${monthW} ${monthSize} text-text-muted text-center`}>
                    {MONTH_LABELS[month]}
                  </span>
                )
              }
              return <div key={wi} className={monthW} />
            })}
          </div>
          {DAY_LABELS.map((label, di) => (
            <div key={label} className={`flex items-center ${gap}`}>
              <span className={`${labelW} ${labelSize} text-text-muted shrink-0`}>{label}</span>
              {weeks.map((week, wi) => {
                const cell = week[di]
                const key = `${wi}-${di}`
                return (
                  <div
                    key={key}
                    className={`relative ${cellSize}`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect()
                      setTooltip({
                        date: cell.date.toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        }),
                        count: cell.count,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div
                      className={`h-full w-full ${rounded} ${cellClass(cell.count)} flex items-center justify-center`}
                    >
                      {large && cell.count > 0 && (
                        <span className="hidden text-[10px] font-semibold text-white lg:block">
                          {cell.date.getDate()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-3 flex items-center justify-end gap-1 ${large ? "lg:mt-4" : ""}`}>
        <span className="text-[10px] text-text-muted">Меньше</span>
        {LEVELS.map((level) => (
          <div key={level.min} className={`${legendSize} ${legendRounded} ${cellClass(level.min + 1)}`} />
        ))}
        <span className="text-[10px] text-text-muted">Больше</span>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          {tooltip.date} — {tooltip.count} {tooltip.count === 1 ? "действие" : "действий"}
        </div>
      )}
    </div>
  )
}
