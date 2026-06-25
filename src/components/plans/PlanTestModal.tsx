"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Send, X } from "lucide-react"
import type { PlanTestQuestion, PlanTestAnswer, PlanTestEvaluation } from "@/types/plan"

interface PlanTestModalProps {
  questions: PlanTestQuestion[]
  onComplete: (answers: PlanTestAnswer[]) => void
  onClose: () => void
  loading?: boolean
}

export function PlanTestModal({ questions, onComplete, onClose, loading }: PlanTestModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentQuestion = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const hasAnswer = answers[currentQuestion?.id]?.trim().length > 0

  const handleNext = () => {
    if (isLast) {
      const allAnswers: PlanTestAnswer[] = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || "",
      }))
      onComplete(allAnswers)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  if (questions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-[20px] border border-border bg-card-bg p-6 shadow-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:bg-background"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">
            Вопрос {currentIndex + 1} из {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === currentIndex ? "bg-primary" : i < currentIndex ? "bg-success" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-base font-semibold leading-relaxed text-foreground">{currentQuestion.question}</p>
          <textarea
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [currentQuestion.id]: e.target.value }))}
            placeholder="Ваш ответ..."
            rows={4}
            className="mt-4 w-full resize-none rounded-[14px] border border-border bg-background p-4 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {!isLast && (
            <button
              onClick={() => setCurrentIndex((i) => i - 1)}
              disabled={currentIndex === 0}
              className="inline-flex h-10 items-center rounded-[12px] border border-border px-5 text-sm font-medium text-text-secondary transition-colors hover:bg-background disabled:opacity-40"
            >
              Назад
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!hasAnswer || loading}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLast ? "Завершить" : "Далее"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
