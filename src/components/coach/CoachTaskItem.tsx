"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Check, ChevronDown, BookOpen } from "lucide-react"
import { useCoachStore } from "@/stores/coach-store"
import type { CoachDayTask, CoachTaskType } from "@/types/coach"

const TYPE_LABELS: Record<CoachTaskType, string> = {
  study: "Изучение",
  practice: "Практика",
  review: "Повторение",
  test: "Тест",
}

const TYPE_COLORS: Record<CoachTaskType, string> = {
  study: "bg-primary",
  practice: "bg-violet-500",
  review: "bg-cyan-600",
  test: "bg-amber-400",
}

const TYPE_TEXT: Record<CoachTaskType, string> = {
  study: "text-primary",
  practice: "text-violet-500",
  review: "text-cyan-600",
  test: "text-amber-500",
}

export interface CoachTaskItemProps {
  task: CoachDayTask
  onToggle: (taskId: string) => void
  onRequestDetail?: (taskId: string) => void
}

export function CoachTaskItem({ task, onToggle, onRequestDetail }: CoachTaskItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const steps = useCoachStore((s) => s.taskSteps[task.id])
  const dotColor = TYPE_COLORS[task.type]
  const textColor = TYPE_TEXT[task.type]
  const label = TYPE_LABELS[task.type]
  const hasSteps = steps && steps.length > 0

  const handleDetail = async () => {
    if (hasSteps) { setExpanded((p) => !p); return }
    if (!onRequestDetail) return
    setLoadingDetail(true)
    try {
      await onRequestDetail(task.id)
      setExpanded(true)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="border-b border-[#F3F4F6] last:border-b-0">
      <div className="flex items-start gap-3 py-3">
        <Checkbox checked={task.completed} onToggle={() => onToggle(task.id)} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium leading-snug ${task.completed ? "text-text-muted line-through" : "text-foreground"}`}>
            {task.title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs ${textColor}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
              {label}
            </span>
            {task.duration ? <span className="text-xs text-text-muted">{task.duration} мин</span> : null}
          </div>
          {!task.completed ? (
            <div className="mt-2">
              <Link
                href={`/teacher?source=coach_task&taskTitle=${encodeURIComponent(task.title)}&taskType=${encodeURIComponent(label)}&prompt=${encodeURIComponent(`Помоги разобраться, как выполнить задачу "${task.title}".`)}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-card-bg hover:text-foreground"
              >
                <Bot className="h-3.5 w-3.5 text-primary" />
                Разобрать в AI Chat
              </Link>
            </div>
          ) : null}
        </div>
        {!task.completed && onRequestDetail ? (
          <button
            type="button"
            onClick={handleDetail}
            disabled={loadingDetail}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Показать план изучения"
          >
            {loadingDetail ? <CoachLoader /> : (
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            )}
          </button>
        ) : null}
      </div>
      <AnimatePresence>
        {expanded && hasSteps ? (
          <motion.div
            key="steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ml-8 border-l-2 border-primary/20 pb-3 pl-4">
              <div className="mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">План изучения</span>
              </div>
              <ul className="space-y-2.5">
                {steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{step.description}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
      style={{ borderColor: checked ? "#2563EB" : "#D1D5DB", backgroundColor: checked ? "#2563EB" : "transparent" }}
    >
      {checked ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
          <Check className="h-3 w-3 text-white" />
        </motion.div>
      ) : null}
    </button>
  )
}

function CoachLoader() {
  const circ = Math.PI * 18
  return (
    <motion.div
      className="flex h-4 w-4 items-center justify-center"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <motion.circle
          cx="12" cy="12" r="9" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * 0.75}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "12px 12px" }}
        />
      </svg>
    </motion.div>
  )
}
