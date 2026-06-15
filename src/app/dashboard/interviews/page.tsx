"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic, ChevronDown, ExternalLink, RotateCcw, MessageSquare,
} from "lucide-react"
import { useProfileStore } from "@/stores/profile-store"

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Продвинутый",
}

export default function DashboardInterviews() {
  const interviews = useProfileStore((s) => s.interviews)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Интервью</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {interviews.length === 0
            ? "Пройдите AI-собеседование, чтобы увидеть результаты"
            : `${interviews.length} пройденных интервью`}
        </p>
      </motion.div>

      {interviews.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Интервью ещё не пройдены</p>
          <p className="mt-1 text-sm text-text-secondary">
            Пройдите AI-собеседование, чтобы оценить свой уровень.
          </p>
        </motion.div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {interviews.map((interview, i) => {
          const isExpanded = expandedId === interview.id

          return (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-[18px] border border-border bg-card-bg overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(interview.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-background"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-wide text-primary">
                      {interview.nctCode}
                    </span>
                    {interview.level && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                        {LEVEL_LABELS[interview.level] || interview.level}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-foreground truncate">
                    {interview.nctTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {interview.questions.length} вопросов &middot;{" "}
                    {new Date(interview.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-5 py-4">
                      {interview.summary && (
                        <div className="mb-4 rounded-[12px] bg-primary-light/50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Итог
                          </p>
                          <p className="mt-1 text-sm text-foreground">{interview.summary}</p>
                        </div>
                      )}

                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
                        Вопросы и ответы
                      </p>

                      <div className="flex flex-col gap-3">
                        {interview.questions.map((qa, qIdx) => (
                          <div
                            key={qa.id}
                            className="rounded-[12px] border border-border bg-background p-3"
                          >
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{qa.question}</p>
                                <div className="mt-2 flex items-start gap-2">
                                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
                                  <p className="text-sm text-text-secondary">{qa.answer}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex gap-3">
                        <Link
                          href={`/interview?code=${encodeURIComponent(interview.nctCode)}&title=${encodeURIComponent(interview.nctTitle)}`}
                          className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Пройти снова
                        </Link>
                        <Link
                          href={`/plan?code=${encodeURIComponent(interview.nctCode)}&title=${encodeURIComponent(interview.nctTitle)}`}
                          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
                        >
                          <ExternalLink className="h-4 w-4" />
                          План развития
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
