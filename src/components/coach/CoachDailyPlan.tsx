"use client"

import { motion } from "framer-motion"
import { Flame, Target, CalendarOff } from "lucide-react"
import { useCoachStore } from "@/stores/coach-store"
import { CoachTaskItem } from "@/components/coach/CoachTaskItem"

export interface CoachDailyPlanProps {
  onGenerate?: () => void
  onRequestTaskDetail?: (taskId: string) => void
}

export function CoachDailyPlan({ onGenerate, onRequestTaskDetail }: CoachDailyPlanProps) {
  const dayPlan = useCoachStore((s) => s.dayPlan)
  const isLoading = useCoachStore((s) => s.isLoading)
  const streak = useCoachStore((s) => s.progress.currentStreak)
  const totalDays = useCoachStore((s) => s.progress.totalDaysActive)
  const toggleTask = useCoachStore((s) => s.toggleTask)

  if (isLoading) return <DailyPlanSkeleton />
  if (!dayPlan) return <DailyPlanEmpty onGenerate={onGenerate} streak={streak} />

  const completed = dayPlan.tasks.filter((t) => t.completed).length
  const total = dayPlan.tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

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

      <div className="rounded-[18px] border border-border bg-card-bg p-4">
        <div className="space-y-0">
          {dayPlan.tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2, ease: "easeOut" }}
            >
              <CoachTaskItem task={task} onToggle={toggleTask} onRequestDetail={onRequestTaskDetail} />
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
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
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
              <div className="h-5 w-5 animate-pulse rounded-md bg-[#E5E7EB]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#E5E7EB]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-[#E5E7EB]" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 h-1.5 animate-pulse rounded-full bg-[#E5E7EB]" />
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
