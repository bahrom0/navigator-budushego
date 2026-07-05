"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, CheckCircle2, GraduationCap, Map } from "lucide-react"
import { useCoachStore } from "@/stores/coach-store"
import { applyActiveGoalBundle } from "@/lib/coach/bundle-client"
import type { ActiveGoalBundle } from "@/types/admission"

interface CoachOverviewCardProps {
  compact?: boolean
}

export function CoachOverviewCard({ compact = false }: CoachOverviewCardProps) {
  const goal = useCoachStore((s) => s.goal)
  const roadmap = useCoachStore((s) => s.roadmap)
  const dayPlan = useCoachStore((s) => s.dayPlan)
  const dailyHistory = useCoachStore((s) => s.dailyHistory)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (goal || roadmap || dayPlan || dailyHistory.length > 0) return

    let cancelled = false

    async function loadBundle() {
      setLoading(true)
      try {
        const res = await fetch("/api/plan/full")
        const payload = (await res.json()) as {
          status?: string
          data?: { bundle?: ActiveGoalBundle | null }
        }

        if (!cancelled && payload.status === "success" && payload.data?.bundle) {
          applyActiveGoalBundle(payload.data.bundle)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadBundle()
    return () => {
      cancelled = true
    }
  }, [dayPlan, dailyHistory.length, goal, roadmap])

  const completedToday = dayPlan?.tasks.filter((task) => task.completed).length ?? 0
  const totalToday = dayPlan?.tasks.length ?? 0
  const totalRoadmapTasks = roadmap?.weeks.reduce((sum, week) => sum + week.tasks.length, 0) ?? 0
  const completedRoadmapTasks = dailyHistory.reduce(
    (sum, plan) => sum + plan.tasks.filter((task) => task.completed).length,
    0,
  )
  const completionPercent = totalRoadmapTasks > 0
    ? Math.round((completedRoadmapTasks / totalRoadmapTasks) * 100)
    : 0
  const activeWeek = useMemo(
    () => roadmap?.weeks.find((week) => week.status === "active") ?? roadmap?.weeks[0] ?? null,
    [roadmap],
  )

  const items = [
    { label: "Сегодня", value: totalToday > 0 ? `${completedToday}/${totalToday}` : "0/0", icon: CalendarDays },
    { label: "Недели", value: roadmap?.weeks.length ?? 0, icon: Map },
    { label: "Прогресс", value: `${completionPercent}%`, icon: CheckCircle2 },
  ]

  return (
    <section className="rounded-[18px] border border-border bg-card-bg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <GraduationCap className="h-4 w-4 text-primary" />
            Coach
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {goal ? `${goal.nctTitle} · ${goal.nctCode}` : "Здесь появятся ежедневный и общий план подготовки."}
          </p>
        </div>
        <Link
          href="/coach"
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          Перейти
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-[14px] bg-background p-3">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 rounded-[14px] bg-background p-4 text-sm text-text-muted">
          Загружаем Coach-планы...
        </div>
      ) : null}

      {!loading && dayPlan ? (
        <div className="mt-4 rounded-[14px] bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ежедневный план</p>
              <p className="mt-1 text-xs text-text-muted">
                {dayPlan.title ?? "Текущий день"}{dayPlan.weekNumber ? ` · неделя ${dayPlan.weekNumber}` : ""}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary">
              {completedToday}/{totalToday}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {dayPlan.tasks.slice(0, compact ? 2 : 3).map((task) => (
              <div key={task.id} className="flex items-start gap-2 rounded-[12px] bg-card-bg px-3 py-2">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${task.completed ? "bg-success" : "bg-primary"}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{task.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{task.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && roadmap ? (
        <div className="mt-4 rounded-[14px] bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Общий план</p>
              <p className="mt-1 text-xs text-text-muted">
                {roadmap.durationWeeks ?? roadmap.weeks.length} недель подготовки
              </p>
            </div>
            {activeWeek ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Неделя {activeWeek.number}
              </span>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {roadmap.weeks.slice(0, compact ? 2 : 3).map((week) => (
              <div key={week.id} className="rounded-[12px] bg-card-bg px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  Неделя {week.number}: {week.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">{week.tasks.length} задач</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !goal && !roadmap && !dayPlan ? (
        <div className="mt-4 rounded-[14px] bg-background p-4 text-sm text-text-muted">
          Сначала создайте общий план, потом здесь появятся roadmap и ежедневные задачи Coach.
        </div>
      ) : null}
    </section>
  )
}
