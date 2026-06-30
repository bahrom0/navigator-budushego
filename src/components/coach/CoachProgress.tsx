"use client"

import { motion } from "framer-motion"
import { Target, CheckCircle, Calendar, TrendingUp, ArrowUpRight } from "lucide-react"
import { useCoachStore } from "@/stores/coach-store"
import { CoachStreak } from "@/components/coach/CoachStreak"
import { CoachSubjectLevel } from "@/components/coach/CoachSubjectLevel"

export function CoachProgress() {
  const progress = useCoachStore((s) => s.progress)
  const diagnostics = useCoachStore((s) => s.diagnostics)
  const roadmap = useCoachStore((s) => s.roadmap)

  const latestDiagnostic = diagnostics[0]
  const completionPct = progress.roadmapCompletionPercent
  const taskCompletionPct = progress.totalTasksPlanned > 0
    ? Math.round((progress.totalTasksCompleted / progress.totalTasksPlanned) * 100)
    : 0

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Прогресс</h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Динамика вашей подготовки к цели
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Target}
          iconBg="bg-primary-light"
          iconColor="text-primary"
          label="Roadmap"
          value={`${completionPct}%`}
          subtext={roadmap ? `${roadmap.weeks.filter((w) => w.status === "completed").length} / ${roadmap.weeks.length} недель` : "не создан"}
          delay={0}
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-success/10"
          iconColor="text-success"
          label="Задач выполнено"
          value={`${progress.totalTasksCompleted}`}
          subtext={`из ${progress.totalTasksPlanned} (${taskCompletionPct}%)`}
          delay={0.05}
        />
        <StatCard
          icon={Calendar}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          label="Дней активно"
          value={`${progress.totalDaysActive}`}
          subtext="за всё время"
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-cyan-600/10"
          iconColor="text-cyan-600"
          label="Темп"
          value={taskCompletionPct >= 70 ? "Отлично" : taskCompletionPct >= 40 ? "Нормально" : "Низкий"}
          subtext={`выполнение ${taskCompletionPct}%`}
          delay={0.15}
        />
      </div>

      <CoachStreak
        currentStreak={progress.currentStreak}
        longestStreak={progress.longestStreak}
        lastActiveDate={progress.lastActiveDate}
      />

      <CoachSubjectLevel
        subjects={progress.subjectLevels}
        strengths={latestDiagnostic?.strengths ?? []}
        weaknesses={latestDiagnostic?.weaknesses ?? []}
      />
    </section>
  )
}

interface StatCardProps {
  icon: typeof Target
  iconBg: string
  iconColor: string
  label: string
  value: string
  subtext: string
  delay: number
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtext, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
      className="rounded-[16px] border border-border bg-card-bg p-4"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-text-muted" />
      </div>
      <p className="mt-3 text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-text-muted">{subtext}</p>
    </motion.div>
  )
}
