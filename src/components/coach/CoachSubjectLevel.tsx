"use client"

import { motion } from "framer-motion"
import { BookOpen, TrendingUp, AlertTriangle } from "lucide-react"
import type { CoachSubjectLevel as CoachSubjectLevelType } from "@/types/coach"

const LEVEL_META: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: "Начальный", color: "text-error", bg: "bg-error/10" },
  intermediate: { label: "Средний", color: "text-warning", bg: "bg-warning/10" },
  advanced: { label: "Продвинутый", color: "text-success", bg: "bg-success/10" },
}

const LEVEL_ORDER = ["beginner", "intermediate", "advanced"]

export interface CoachSubjectLevelProps {
  subjects: CoachSubjectLevelType[]
  strengths: string[]
  weaknesses: string[]
}

export function CoachSubjectLevel({ subjects, strengths, weaknesses }: CoachSubjectLevelProps) {
  if (subjects.length === 0) {
    return (
      <div className="rounded-[18px] border border-border bg-card-bg p-5 text-center">
        <div className="mx-auto flex max-w-xs flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            Уровни по предметам
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Пройдите диагностику, чтобы увидеть свой уровень.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-border bg-card-bg p-5">
        <h3 className="text-sm font-semibold text-foreground">Уровни по предметам</h3>
        <div className="mt-4 space-y-4">
          {subjects.map((subject, i) => {
            const meta = LEVEL_META[subject.level] ?? LEVEL_META.beginner
            const maxScore = 100
            const levelIndex = LEVEL_ORDER.indexOf(subject.level)
            const segmentWidth = 100 / LEVEL_ORDER.length

            return (
              <motion.div
                key={subject.subject}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2, ease: "easeOut" }}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {subject.subject}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-border/35">
                  {LEVEL_ORDER.map((_, segIndex) => (
                    <div
                      key={segIndex}
                      className={`h-full transition-colors duration-300 ${
                        segIndex <= levelIndex ? "bg-primary" : "bg-transparent"
                      }`}
                      style={{ width: `${segmentWidth}%` }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  {subject.score}% правильных ответов
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {(strengths.length > 0 || weaknesses.length > 0) ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {strengths.length > 0 ? (
            <div className="rounded-[14px] border border-border bg-card-bg p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <h4 className="text-sm font-semibold text-foreground">Сильные стороны</h4>
              </div>
              <ul className="mt-3 space-y-1.5">
                {strengths.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {weaknesses.length > 0 ? (
            <div className="rounded-[14px] border border-border bg-card-bg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h4 className="text-sm font-semibold text-foreground">Слабые стороны</h4>
              </div>
              <ul className="mt-3 space-y-1.5">
                {weaknesses.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
