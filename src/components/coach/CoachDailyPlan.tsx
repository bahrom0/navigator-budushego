"use client"

import { useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Bot, Flame, Target, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react"
import { useCoachStore } from "@/stores/coach-store"
import { CoachTaskItem } from "@/components/coach/CoachTaskItem"

export interface CoachDailyPlanProps {
  onGenerate?: () => void
  onRequestTaskDetail?: (taskId: string) => void
  onNavigateDate?: (date: string) => void
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)

  if (diff === 0) return "Сегодня"
  if (diff === -1) return "Вчера"
  if (diff === 1) return "Завтра"

  const months = [
    "янв", "фев", "мар", "апр", "май", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек",
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function CoachDailyPlan({ onGenerate, onRequestTaskDetail, onNavigateDate }: CoachDailyPlanProps) {
  const dayPlan = useCoachStore((s) => s.dayPlan)
  const isLoading = useCoachStore((s) => s.isLoading)
  const streak = useCoachStore((s) => s.progress.currentStreak)
  const totalDays = useCoachStore((s) => s.progress.totalDaysActive)
  const toggleTask = useCoachStore((s) => s.toggleTask)
  const persistToggleTask = useCoachStore((s) => s.persistToggleTask)
  const navigateDate = useCoachStore((s) => s.navigateDate)

  const goBack = useCallback(() => {
    const d = new Date(`${navigateDate}T00:00:00`)
    d.setDate(d.getDate() - 1)
    onNavigateDate?.(d.toISOString().slice(0, 10))
  }, [navigateDate, onNavigateDate])

  const goForward = useCallback(() => {
    const d = new Date(`${navigateDate}T00:00:00`)
    d.setDate(d.getDate() + 1)
    onNavigateDate?.(d.toISOString().slice(0, 10))
  }, [navigateDate, onNavigateDate])

  if (isLoading) return <DailyPlanSkeleton />
  if (!dayPlan) return <DailyPlanEmpty onGenerate={onGenerate} streak={streak} />

  const completed = dayPlan.tasks.filter((t) => t.completed).length
  const total = dayPlan.tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const handleToggle = (taskId: string) => {
    const task = dayPlan.tasks.find((t) => t.id === taskId)
    if (!task) return
    toggleTask(taskId)
    if (dayPlan.dailyPlanId) {
      persistToggleTask(dayPlan.dailyPlanId, taskId, !task.completed)
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Сегодня</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            День {totalDays}
            {streak > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1 text-warning">
                <Flame className="h-3.5 w-3.5" />
                {streak} {pluralDays(streak)}
              </span>
            ) : null}
          </p>
        </div>
        <span className="text-xs font-medium text-text-muted">
          {completed}/{total}
        </span>
      </div>

      <div className="mb-4 flex justify-end">
        <Link
          href={`/teacher?source=coach_today&topic=${encodeURIComponent("today_plan")}&prompt=${encodeURIComponent("Помоги понять, как пройти сегодняшний план и на что обратить внимание при выполнении задач.")}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-border bg-card-bg px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Bot className="h-4 w-4 text-primary" />
          Спросить AI Chat про этот день
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={!dayPlan.previousDate && navigateDate <= dayPlan.date}
          className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-border px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Назад
        </button>
        <span className="text-xs font-medium text-text-muted">
          {formatDate(navigateDate)}
        </span>
        <button
          type="button"
          onClick={goForward}
          disabled={!dayPlan.nextDate && navigateDate >= new Date().toISOString().slice(0, 10)}
          className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-border px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          Вперёд
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="rounded-[18px] border border-border bg-card-bg p-4">
        <div className="space-y-0">
          {dayPlan.tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2, ease: "easeOut" }}
            >
              <CoachTaskItem task={task} onToggle={handleToggle} onRequestDetail={onRequestTaskDetail} />
            </motion.div>
          ))}
        </div>

        <div className="mt-4">
          <DayProgressBar pct={pct} />
        </div>
      </div>
    </section>
  )
}

function DayProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/35">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-text-muted">
        {pct}%
      </span>
    </div>
  )
}

function DailyPlanEmpty({
  onGenerate,
  streak,
}: {
  onGenerate?: () => void
  streak: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] border border-border bg-card-bg p-6 text-center"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          План на сегодня формируется
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Coach анализирует ваш прогресс и строит план.
        </p>
        {onGenerate ? (
          <button
            type="button"
            onClick={onGenerate}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <CalendarOff className="h-4 w-4" />
            Создать план
          </button>
        ) : null}
      </div>
    </motion.section>
  )
}

function DailyPlanSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-32 animate-pulse rounded bg-card-bg" />
      <div className="rounded-[18px] border border-border bg-card-bg p-4">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 animate-pulse rounded-md bg-border/35" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-border/35" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-border/35" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 h-1.5 animate-pulse rounded-full bg-border/35" />
      </div>
    </div>
  )
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "день"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня"
  return "дней"
}
