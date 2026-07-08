"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Sparkles, RotateCcw, ListChecks, ArrowLeft } from "lucide-react"
import type { CoachMiniTestAnswerReview, CoachMiniTestResult } from "@/types/coach"

interface MiniTestQuestion {
  id?: string
  question: string
  options?: string[]
  correctIndex?: number
  explanation?: string
}

interface CoachMiniTestProps {
  questions: MiniTestQuestion[]
  subject?: string
  result?: CoachMiniTestResult
  onComplete?: (results: {
    correct: number
    total: number
    selectedAnswers: Array<number | null>
    review: CoachMiniTestAnswerReview[]
  }) => void
  onRetry?: () => void
}

function FeedbackBanner({ isCorrect, correctAnswer, explanation }: { isCorrect: boolean; correctAnswer: string; explanation?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`mb-3 overflow-hidden rounded-xl ${
        isCorrect
          ? "border border-success/30 bg-success/10"
          : "border border-error/20 bg-error/5"
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isCorrect ? "bg-success text-white" : "bg-error text-white"
          }`}>
            {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </div>
          <p className={`text-sm font-bold ${isCorrect ? "text-success" : "text-error"}`}>
            {isCorrect ? "Верно!" : "Неверно"}
          </p>
        </div>

        {!isCorrect && (
          <div className="ml-9 mt-2">
            <p className="mb-1 text-xs text-text-secondary">Правильный ответ:</p>
            <p className="text-sm font-semibold text-success">{correctAnswer}</p>
          </div>
        )}

        {explanation && (
          <div className="ml-9 mt-2">
            <p className="text-xs leading-relaxed text-text-secondary">
              {explanation}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function buildReview(questions: MiniTestQuestion[], selectedAnswers: Array<number | null>): CoachMiniTestAnswerReview[] {
  return questions.map((question, index) => {
    const selectedIndex = selectedAnswers[index] ?? null
    const correctIndex = question.correctIndex ?? 0
    return {
      questionId: question.id ?? `question-${index + 1}`,
      question: question.question,
      selectedIndex,
      selectedAnswer: selectedIndex != null && question.options ? question.options[selectedIndex] : undefined,
      correctIndex,
      correctAnswer: question.options?.[correctIndex],
      explanation: question.explanation,
      isCorrect: selectedIndex != null && selectedIndex === correctIndex,
    }
  })
}

export function CoachMiniTest({ questions, subject, result, onComplete, onRetry }: CoachMiniTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(() => result?.selectedAnswers ?? Array(questions.length).fill(null))
  const [phase, setPhase] = useState<"answering" | "answered" | "complete" | "history">(
    result ? "complete" : "answering",
  )

  useEffect(() => {
    setAnswers(result?.selectedAnswers ?? Array(questions.length).fill(null))
    setCurrentIndex(0)
    setSelected(null)
    setPhase(result ? "complete" : "answering")
  }, [questions, result])

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  const calcCorrect = () => answers.filter((answer, index) => {
    const question = questions[index]
    return answer != null && question != null && answer === question.correctIndex
  }).length

  const handleSelect = useCallback((index: number) => {
    if (phase !== "answering") return
    setSelected(index)
    setAnswers((prev) => {
      const next = [...prev]
      next[currentIndex] = index
      return next
    })
    setPhase("answered")
  }, [phase, currentIndex])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => prev + 1)
    setSelected(null)
    setPhase("answering")
  }, [])

  const handleFinish = useCallback(() => {
    const correct = calcCorrect()
    const nextAnswers = answers.map((answer) => answer ?? null)
    const review = buildReview(questions, nextAnswers)
    setPhase("complete")
    onComplete?.({
      correct,
      total: questions.length,
      selectedAnswers: nextAnswers,
      review,
    })
  }, [answers, onComplete, questions])

  const handleRetry = useCallback(() => {
    setCurrentIndex(0)
    setSelected(null)
    setAnswers(Array(questions.length).fill(null))
    setPhase("answering")
    onRetry?.()
  }, [questions.length, onRetry])

  const correct = result?.correctAnswers ?? calcCorrect()
  const incorrect = questions.length - correct
  const review = result?.review ?? buildReview(questions, answers.map((answer) => answer ?? null))

  if (phase === "complete") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-[12px] border border-border bg-card-bg p-4"
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            correct === questions.length ? "bg-success/10" : "bg-primary/10"
          }`}>
            <Sparkles className={`h-6 w-6 ${
              correct === questions.length ? "text-success" : "text-primary"
            }`} />
          </div>
          <p className="text-[15px] font-bold">
            {correct === questions.length ? "Идеально!" : "Мини-тест завершён!"}
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-success">{correct}</span>
              <span className="text-text-secondary">правильно</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-error">{incorrect}</span>
              <span className="text-text-secondary">неправильно</span>
            </span>
          </div>
          <div className="mt-1 h-2 w-full max-w-[200px] rounded-full bg-border">
            <motion.div
              className="h-full rounded-full bg-success"
              initial={{ width: 0 }}
              animate={{ width: `${questions.length > 0 ? (correct / questions.length) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPhase("history")}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-border text-sm font-medium text-text-secondary transition-colors hover:bg-border/30"
          >
            <ListChecks className="h-4 w-4" />
            Посмотреть ответы
          </button>
          <button
            type="button"
            onClick={handleRetry}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <RotateCcw className="h-4 w-4" />
            Повторить
          </button>
        </div>
      </motion.div>
    )
  }

  if (phase === "history") {
    return (
      <div className="rounded-[12px] border border-border bg-card-bg p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">История ответов</p>
          <button type="button" onClick={() => setPhase("complete")} className="text-xs text-primary hover:underline">
            Назад
          </button>
        </div>
        <div className="space-y-3">
          {review.map((item, index) => (
            <div
              key={item.questionId}
              className={`rounded-[10px] border p-3 text-sm ${
                item.isCorrect ? "border-success/20 bg-success/[0.03]" : "border-error/15 bg-error/[0.02]"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.isCorrect ? "bg-success/10 text-success" : "bg-error/10 text-error"
                }`}>
                  {item.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{index + 1}. {item.question}</p>
                  <div className="mt-1.5 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Ваш ответ:</span>
                      <span className={`font-medium ${item.isCorrect ? "text-success" : "text-error"}`}>
                        {item.selectedAnswer ?? "—"}
                      </span>
                    </div>
                    {!item.isCorrect && (
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">Правильный:</span>
                        <span className="font-medium text-success">{item.correctAnswer ?? "—"}</span>
                      </div>
                    )}
                  </div>
                  {item.explanation && (
                    <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                      {item.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPhase("complete")}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] border border-border text-sm font-medium text-text-secondary transition-colors hover:bg-border/30"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к результатам
        </button>
      </div>
    )
  }

  const currentCorrectIndex = current.correctIndex
  const isCurrentCorrect = selected != null && currentCorrectIndex != null && selected === currentCorrectIndex
  const correctAnswerText = currentCorrectIndex != null && current.options
    ? current.options[currentCorrectIndex]
    : ""

  return (
    <div className="rounded-[12px] border border-border bg-card-bg p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-primary" : index < currentIndex ? "bg-success" : "bg-border"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-text-secondary">Вопрос {currentIndex + 1} из {questions.length}</span>
      </div>

      <p className="mb-3 text-sm font-medium text-text-secondary">
        Мини-тест{subject ? ` • ${subject}` : ""}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <p className="mb-3 text-[15px] font-bold">{current.question}</p>

          {phase === "answered" && (
            <FeedbackBanner
              isCorrect={isCurrentCorrect}
              correctAnswer={correctAnswerText}
              explanation={current.explanation}
            />
          )}

          <div className="flex flex-col gap-2">
            {current.options?.map((option, index) => {
              const answered = phase === "answered"
              const isSelected = selected === index
              const isCorrect = currentCorrectIndex != null && index === currentCorrectIndex
              const isWrongSelected = answered && isSelected && !isCorrect

              let btnStyle = "border-border hover:border-primary hover:bg-primary/[0.02]"
              if (answered && isCorrect) btnStyle = "border-success/50 bg-success/10 text-success"
              else if (isWrongSelected) btnStyle = "border-error/50 bg-error/8 text-error"

              return (
                <button
                  key={index}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelect(index)}
                  className={`flex min-h-[44px] items-center rounded-[12px] border px-4 text-sm transition-all disabled:cursor-default ${
                    !answered ? "active:scale-[0.98]" : ""
                  } ${btnStyle}`}
                >
                  <span className="flex-1 text-left">{option}</span>
                  {answered && isCorrect && <Check className="h-4 w-4 shrink-0" />}
                  {isWrongSelected && <X className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {phase === "answered" && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          type="button"
          onClick={isLast ? handleFinish : handleNext}
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:scale-[0.98]"
        >
          {isLast ? "Завершить" : "Далее"}
        </motion.button>
      )}
    </div>
  )
}
