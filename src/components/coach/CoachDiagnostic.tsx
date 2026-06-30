"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SkipForward } from "lucide-react"
import { useCoachStore } from "@/stores/coach-store"
import type { DiagnosticApiQuestion, DiagnosticAnswer, DiagnosticResult } from "@/types/diagnostic"
import { DiagnosticOption } from "./DiagnosticOption"
import { DiagnosticReview } from "./DiagnosticReview"
import { DiagnosticLoading, DiagnosticDone } from "./DiagnosticStates"

export interface CoachDiagnosticProps {
  nctCode: string
  nctTitle: string
  onComplete?: (result: DiagnosticResult) => void
  onSkip?: () => void
}

type Phase = "loading" | "active" | "done"

export function CoachDiagnostic({
  nctCode,
  nctTitle,
  onComplete,
  onSkip,
}: CoachDiagnosticProps) {
  const setError = useCoachStore((s) => s.setError)
  const [phase, setPhase] = useState<Phase>("loading")
  const [questions, setQuestions] = useState<DiagnosticApiQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchQuestions = async () => {
      try {
        const res = await fetch("/api/coach/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nctCode, nctTitle }),
        })
        const payload = (await res.json()) as {
          status?: string
          data?: { questions?: DiagnosticApiQuestion[] }
          error?: string
        }
        if (cancelled) return
        if (!res.ok || payload.status !== "success" || !payload.data?.questions) {
          throw new Error(payload.error ?? "Не удалось загрузить диагностику")
        }
        setQuestions(payload.data.questions)
        setPhase("active")
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : "Ошибка загрузки"
        setError(msg)
        setPhase("done")
      }
    }
    fetchQuestions()
    return () => { cancelled = true }
  }, [nctCode, nctTitle, setError])

  const current = questions[currentIndex] ?? null

  const handleSelect = useCallback(
    (index: number) => {
      if (selected !== null || !current) return
      setSelected(index)
      setAnswers((prev) => [
        ...prev,
        {
          questionId: current.id,
          selectedIndex: index,
          isCorrect: index === current.correctIndex,
          skipped: false,
        },
      ])
      setShowReview(true)
    },
    [selected, current],
  )

  const handleSkip = useCallback(() => {
    if (!current) return
    setAnswers((prev) => [
      ...prev,
      { questionId: current.id, selectedIndex: null, isCorrect: false, skipped: true },
    ])
    setShowReview(true)
  }, [current])

  const handleNext = useCallback(() => {
    setSelected(null)
    setShowReview(false)
    if (currentIndex + 1 >= questions.length) {
      setPhase("done")
      const currentAnswers = answers
      onComplete?.({
        questions,
        answers: currentAnswers,
        correctCount: currentAnswers.filter((a) => a.isCorrect).length,
        totalCount: questions.length,
      })
      return
    }
    setCurrentIndex((i) => i + 1)
  }, [currentIndex, questions, answers, onComplete])

  if (phase === "loading") return <DiagnosticLoading onSkip={onSkip} />
  if (phase === "done" || !current) return <DiagnosticDone answers={answers} questions={questions} />

  return (
    <section className="mx-auto w-full max-w-[480px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-[18px] border border-border bg-card-bg p-6 shadow-sm"
        >
          <DiagnosticProgress current={currentIndex + 1} total={questions.length} />
          <p className="mt-2 text-xs font-medium text-text-muted">
            {current.subject} / {current.difficulty}
          </p>
          <h2 className="mt-3 text-base font-semibold leading-snug text-foreground">
            {current.question}
          </h2>
          <ul className="mt-5 space-y-2" role="radiogroup">
            {current.options.map((option, idx) => (
              <DiagnosticOption
                key={idx}
                text={option}
                index={idx}
                selected={selected}
                correctIndex={current.correctIndex}
                showResult={showReview}
                onSelect={handleSelect}
              />
            ))}
          </ul>
          {showReview ? (
            <DiagnosticReview
              explanation={current.explanation}
              isCorrect={selected === current.correctIndex}
            />
          ) : null}
          <div className="mt-5 flex items-center justify-end gap-3">
            {onSkip && currentIndex === 0 && !showReview ? (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-sm text-text-muted transition-colors hover:text-foreground"
              >
                <SkipForward className="h-4 w-4" />
                Пропустить диагностику
              </button>
            ) : null}
            {!showReview ? (
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-sm text-text-secondary transition-colors hover:text-foreground"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Пропустить
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                {currentIndex + 1 >= questions.length ? "Завершить" : "Далее"}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function DiagnosticProgress({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Вопрос {current} из {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
