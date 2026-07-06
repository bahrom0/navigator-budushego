"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle,
  Circle,
  PlayCircle,
  ChevronDown,
  Map,
  Clock,
  Bot,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCoachStore } from "@/stores/coach-store"
import { RoadmapDurationModal } from "@/components/coach/RoadmapDurationModal"
import type { CoachWeek, CoachWeekStatus, RoadmapDurationWeeks } from "@/types/coach"

const STATUS_ICONS: Record<CoachWeekStatus, typeof CheckCircle> = {
  completed: CheckCircle,
  active: PlayCircle,
  pending: Circle,
}

const STATUS_COLORS: Record<CoachWeekStatus, string> = {
  completed: "text-emerald-500",
  active: "text-primary",
  pending: "text-text-muted",
}

export interface CoachRoadmapProps {
  onGenerate?: (durationWeeks?: RoadmapDurationWeeks) => void
}

function durationLabel(weeks?: number): string {
  if (!weeks) return ""
  if (weeks === 1) return "1 неделя"
  if (weeks < 5) return `${weeks} недели`
  return `${weeks} недель`
}

export function CoachRoadmap({ onGenerate }: CoachRoadmapProps) {
  const router = useRouter()
  const roadmap = useCoachStore((s) => s.roadmap)
  const isLoading = useCoachStore((s) => s.isLoading)
  const [showModal, setShowModal] = useState(false)

  if (isLoading) return <RoadmapSkeleton />
  if (!roadmap) {
    return (
      <>
        <RoadmapEmpty onGenerate={() => setShowModal(true)} />
        <RoadmapDurationModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={(duration) => {
            setShowModal(false)
            onGenerate?.(duration)
          }}
          loading={isLoading}
        />
      </>
    )
  }

  const completedCount = roadmap.weeks.filter((week) => week.status === "completed").length
  const activeWeek = roadmap.weeks.find((week) => week.status === "active") ?? roadmap.weeks[0] ?? null

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Roadmap</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
            <span>{roadmap.weeks.length} недель · пройдено {completedCount}</span>
            {roadmap.durationWeeks ? (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" />
                {durationLabel(roadmap.durationWeeks)}
              </span>
            ) : null}
          </p>
        </div>
        {activeWeek ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/chat?intent=week")}
              className="inline-flex min-h-10 items-center rounded-[12px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-card-bg"
            >
              Обсудить неделю {activeWeek.number}
            </button>
            <button
              type="button"
              onClick={() => router.push(
                `/teacher?source=coach_roadmap&topic=${encodeURIComponent("roadmap_week")}&weekTitle=${encodeURIComponent(activeWeek.title)}&weekNumber=${encodeURIComponent(String(activeWeek.number))}&prompt=${encodeURIComponent(`Объясни, как пройти неделю ${activeWeek.number} "${activeWeek.title}" и на какие темы обратить особое внимание.`)}`,
              )}
              className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-card-bg"
            >
              <Bot className="h-4 w-4 text-primary" />
              Разобрать неделю в AI Chat
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        {roadmap.weeks.map((week, index) => (
          <motion.div
            key={week.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.04,
              duration: 0.25,
              ease: "easeOut",
            }}
          >
            <WeekCard week={week} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function WeekCard({ week }: { week: CoachWeek }) {
  const [expanded, setExpanded] = useState(week.status === "active")
  const StatusIcon = STATUS_ICONS[week.status]
  const statusColor = STATUS_COLORS[week.status]

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[14px] border border-border bg-card-bg"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor}`} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              week.status === "completed"
                ? "text-text-muted line-through"
                : "text-foreground"
            }`}
          >
            Неделя {week.number} — {week.title}
          </p>
          {week.status === "active" ? (
            <p className="mt-0.5 text-xs font-medium text-primary">
              АКТИВНАЯ НЕДЕЛЯ
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3">
              <p className="text-xs leading-relaxed text-text-secondary">
                {week.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {week.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-[6px] bg-muted px-2 py-0.5 text-[11px] text-text-muted"
                  >
                    {subject}
                  </span>
                ))}
              </div>
              <WeekTasks tasks={week.tasks} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

function WeekTasks({ tasks }: { tasks: CoachWeek["tasks"] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-start gap-2 text-xs text-text-secondary"
        >
          <TaskDot type={task.type} />
          <span>{task.title}</span>
        </li>
      ))}
    </ul>
  )
}

const DOT_COLORS: Record<string, string> = {
  study: "bg-primary",
  practice: "bg-violet-500",
  review: "bg-cyan-600",
  test: "bg-amber-400",
}

function TaskDot({ type }: { type: string }) {
  const color = DOT_COLORS[type] ?? "bg-text-muted"
  return (
    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />
  )
}

function RoadmapEmpty({ onGenerate }: { onGenerate?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] border border-border bg-card-bg p-6 text-center"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
          <Map className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          Маршрут подготовки еще не создан
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Пройдите диагностику, чтобы Coach построил персонализированный roadmap.
        </p>
        {onGenerate ? (
          <button
            type="button"
            onClick={onGenerate}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Создать roadmap
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-[72px] animate-pulse rounded-[14px] bg-card-bg"
        />
      ))}
    </div>
  )
}
