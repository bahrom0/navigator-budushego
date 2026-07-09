"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, RefreshCw, CheckCircle2 } from "lucide-react"
import { useInterviewStore } from "@/stores/interview-store"
import { useCategoryStore } from "@/stores/category-store"
import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"

function InterviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryStore = useCategoryStore()
  const upsertInterview = useProfileStore((s) => s.upsertInterview)
  const [submitting, setSubmitting] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [finalSummary, setFinalSummary] = useState<string>("")
  const [finalLevel, setFinalLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner")

  const nctCode = searchParams.get("code") || ""
  const nctTitle = searchParams.get("title") || ""

  const {
    currentStep,
    currentQuestionIndex,
    questions,
    answers,
    error,
    setNctContext,
    setActive,
    setCompleted,
    setError,
    setLoading,
    addAnswer,
    nextQuestion,
    reset,
  } = useInterviewStore()

  const currentQuestion = questions[currentQuestionIndex]
  const [textAnswer, setTextAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const createPlanFromInterview = useCallback(async (
    options?: {
      answers?: Array<{ question: string; answer: string }>
      summary?: string
      level?: "beginner" | "intermediate" | "advanced"
    },
  ) => {
    if (!nctCode || !nctTitle || creatingPlan) return
    setCreatingPlan(true)
    setPlanError(null)

    const interviewAnswers = options?.answers ?? answers.map((item) => ({ question: item.question, answer: item.answer }))
    const interviewSummary = options?.summary ?? finalSummary
    const interviewLevel = options?.level ?? finalLevel
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode,
          nctTitle,
          university: "",
          profession: "",
          city: "",
          userInterests: categoryStore.selected,
          previousAnswers: interviewAnswers,
          diagnosticContext: {
            source: "interview",
            summary: interviewSummary || undefined,
            level: interviewLevel,
            answers: interviewAnswers,
          },
          assessment: {
            level: interviewLevel,
            skills: [],
            strengths: [],
            gaps: [],
          },
        }),
      })

      const result = await res.json()
      if (!res.ok || result.status !== "success") {
        throw new Error(result.error || "Не удалось создать план развития")
      }

      if (typeof window !== "undefined" && result.data) {
        window.sessionStorage.setItem(
          "pending_generated_plan_v1",
          JSON.stringify({
            goalId: result.data.goal_id ?? null,
            nctCode,
            nctTitle,
            plan: result.data,
          }),
        )
      }

      router.push(`/plan?code=${encodeURIComponent(nctCode)}&title=${encodeURIComponent(nctTitle)}&source=interview`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Не удалось создать план развития")
      setCreatingPlan(false)
    }
  }, [answers, categoryStore.selected, creatingPlan, finalLevel, finalSummary, nctCode, nctTitle, router])

  useEffect(() => {
    if (!nctCode) {
      router.replace("/recommendations")
      return
    }
    setNctContext(nctCode, nctTitle)
    startInterview()
  }, [nctCode])

  useEffect(() => {
    setSelectedOption(null)
    setTextAnswer("")
  }, [currentQuestionIndex])

  const startInterview = useCallback(async () => {
    setLoading()
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode,
          nctTitle: nctTitle || "выбранное направление",
          userInterests: categoryStore.selected,
        }),
      })
      const result = await res.json()
      if (result.status === "error") {
        setError(result.error)
        return
      }
      if (result.data?.questions?.length) {
        setActive(result.data.questions)
        logActivityEvent("start_interview", `Интервью для кода: ${nctCode}`)
      } else {
        setError("Не удалось получить вопросы")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети")
    }
  }, [nctCode, nctTitle])

  const submitAnswer = useCallback(async () => {
    if (!currentQuestion) return
    const answer = currentQuestion.type === "choice" ? selectedOption ?? "" : textAnswer.trim()
    if (!answer) return

    setSubmitting(true)

    try {
      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode,
          nctTitle,
          question: currentQuestion.question,
          answer,
          questionIndex: currentQuestionIndex,
          previousAnswers: [
            ...answers.map((a) => ({ questionId: a.questionId, question: a.question, answer: a.answer })),
            { questionId: currentQuestion.id, question: currentQuestion.question, answer },
          ],
        }),
      })
      const result = await res.json()
      if (result.status === "error") {
        setError(result.error)
        setSubmitting(false)
        return
      }

      addAnswer({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        answer,
        timestamp: Date.now(),
      })

      if (result.data?.isComplete) {
        const completedSummary = result.data.summary || "Интервью завершено."
        const completedLevel = result.data.level || "beginner"
        const completedAnswers = [
          ...answers.map((a) => ({ question: a.question, answer: a.answer })),
          { question: currentQuestion.question, answer },
        ]
        setCompleted(result.data.summary || "Интервью завершено.")
        setFinalSummary(result.data.summary || "Интервью завершено.")
        setFinalLevel(result.data.level || "beginner")
        setCompleted(completedSummary)
        setFinalSummary(completedSummary)
        setFinalLevel(completedLevel)
        upsertInterview({
          nctCode,
          nctTitle: nctTitle || "выбранное направление",
          questions: [...answers.map((a) => ({ id: a.questionId, question: a.question, answer: a.answer })),
            { id: currentQuestion.id, question: currentQuestion.question, answer },
          ],
          summary: result.data.summary,
          level: result.data.level,
        })
        logActivityEvent("finish_interview", `Интервью для ${nctCode} завершено`)
        void createPlanFromInterview({
          answers: completedAnswers,
          summary: completedSummary,
          level: completedLevel,
        })
      } else {
        nextQuestion()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети")
    } finally {
      setSubmitting(false)
    }
  }, [answers, createPlanFromInterview, currentQuestion, currentQuestionIndex, nctCode, nctTitle, selectedOption, textAnswer])

  if (currentStep === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-text-secondary">Подготавливаем вопросы...</p>
      </main>
    )
  }

  if (currentStep === "completed") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Интервью завершено</h1>
          <p className="mt-3 leading-relaxed text-text-secondary">
            Вы прошли профориентационное интервью. На основе ваших ответов мы подготовим персонализированные рекомендации.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => void createPlanFromInterview()}
              disabled={creatingPlan}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
            >
              {creatingPlan ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Создаём план...
                </>
              ) : (
                "Перейти к плану развития"
              )}
            </button>
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Пройти снова
            </button>
            {planError ? <p className="text-sm text-error">{planError}</p> : null}
          </div>
        </motion.div>
      </main>
    )
  }

  if (error && !currentQuestion) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="text-sm font-medium text-error">Не удалось загрузить интервью</p>
          {typeof error === "string" && <p className="mt-2 text-sm text-text-secondary">{error}</p>}
          <button
            onClick={startInterview}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
        </motion.div>
      </main>
    )
  }

  if (!currentQuestion) return null

  const progress = questions.length > 1 ? ((currentQuestionIndex) / (questions.length - 1)) * 100 : 0
  const canSubmit = currentQuestion.type === "choice" ? selectedOption !== null : textAnswer.trim().length > 0

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto max-w-2xl w-full">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div>
            <span className="text-xs font-semibold tracking-wide text-primary">{nctCode}</span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Профориентационное интервью</h1>
            <p className="mt-1 text-xs text-text-muted">
              Вопрос {currentQuestionIndex + 1} из {questions.length}
            </p>
          </div>
        </div>

        <div className="mb-6 h-1 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-[20px] border border-border bg-card-bg p-6"
          >
            <h2 className="text-lg font-semibold leading-snug text-foreground">{currentQuestion.question}</h2>

            <div className="mt-5 space-y-3">
              {currentQuestion.type === "choice" && currentQuestion.options ? (
                currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full rounded-[14px] border px-5 py-3.5 text-left text-sm transition-colors ${
                      selectedOption === option
                        ? "border-primary bg-primary-light/60 text-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {option}
                  </button>
                ))
              ) : (
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Введите ваш ответ..."
                  rows={4}
                  className="w-full resize-none rounded-[14px] border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-text-muted outline-none transition-colors focus:border-primary"
                />
              )}
            </div>

            <button
              onClick={submitAnswer}
              disabled={!canSubmit || submitting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Анализируем...
                </>
              ) : (
                "Ответить"
              )}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}

function InterviewSkeleton() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-text-secondary">Загрузка...</p>
    </main>
  )
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<InterviewSkeleton />}>
      <InterviewContent />
    </Suspense>
  )
}
