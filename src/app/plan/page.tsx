"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, CheckCircle, Clock, FlaskConical } from "lucide-react"
import type { DevelopmentPlan, PlanTestQuestion, PlanTestAnswer, PlanTestEvaluation } from "@/types/plan"
import type { PlanStatus } from "@/types/plan"
import { PlanCard } from "@/components/plans/PlanCard"
import { PlanTodoItem } from "@/components/plans/PlanTodoItem"
import { PlanTestModal } from "@/components/plans/PlanTestModal"
import { PlanResultModal } from "@/components/plans/PlanResultModal"
import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"

function parseCompletedSteps(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((s: unknown): s is string => typeof s === "string")
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((s: unknown): s is string => typeof s === "string")
      }
    } catch {
      // not valid JSON, fall through
    }
  }
  return []
}

function safeParseJSONArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
      }
    } catch {
      // not valid JSON, fall through
    }
  }
  return []
}

function PlanContent() {
  const searchParams = useSearchParams()
  const nctCode = searchParams.get("code") || ""
  const nctTitle = searchParams.get("title") || ""

  const { plans, upsertPlan, setLevel } = useProfileStore()

  const [plan, setPlan] = useState<DevelopmentPlan | null>(null)
  const [planRecordId, setPlanRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [status, setStatus] = useState<PlanStatus>("active")

  const [showTest, setShowTest] = useState(false)
  const [testQuestions, setTestQuestions] = useState<PlanTestQuestion[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<PlanTestEvaluation | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const [savingTodoId, setSavingTodoId] = useState<string | null>(null)
  const saveInFlight = useRef<Promise<void> | null>(null)
  const mounted = useRef(true)
  const generatedLocal = useRef(false)

  const deriveTodos = useCallback((p: DevelopmentPlan) => {
    const todos: { id: string; label: string; stageId: string }[] = []
    for (const stage of p.stages) {
      stage.recommendations.forEach((rec, idx) => {
        todos.push({ id: `${stage.id}:${idx}`, label: rec, stageId: stage.id })
      })
    }
    return todos
  }, [])

  const [todos, setTodos] = useState<ReturnType<typeof deriveTodos>>([])

  const pendingSave = useCallback(
    async (todoId: string, newSteps: string[], newStatus: PlanStatus) => {
      setSavingTodoId(todoId)
      if (saveInFlight.current) await saveInFlight.current

      const builder = Promise.resolve().then(async () => {
        try {
          await fetch("/api/plan/todos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nctCode, completedSteps: newSteps, status: newStatus }),
          })
        } catch {
          // silent
        } finally {
          if (mounted.current && saveInFlight.current === builder) {
            setSavingTodoId(null)
          }
        }
      })

      saveInFlight.current = builder
    },
    [nctCode],
  )

  // Main init effect — runs once per nctCode
  useEffect(() => {
    mounted.current = true
    generatedLocal.current = false

    return () => {
      mounted.current = false
      saveInFlight.current = null
    }
  }, [nctCode])

  useEffect(() => {
    if (!nctCode) {
      setLoading(false)
      return
    }

    let cancelled = false

    const initPlan = async () => {
      setLoading(true)
      setError(null)

      const localPlan = plans.find((p) => p.nctCode === nctCode)

      // Priority 1: DB first
      let dbRecord: { id: string; nct_code: string; nct_title: string; level: string; goals: unknown; stages: unknown; completed_steps: string[]; status: PlanStatus | undefined } | null =
        null

      try {
        const resp = await fetch("/api/plan/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nctCode }),
        })
        if (cancelled) return
        const raw = await resp.json()
        if (raw.status === "success" && raw.data) {
           dbRecord = {
            id: raw.data.id || `db-${nctCode}`,
            nct_code: raw.data.nct_code || nctCode,
            nct_title: raw.data.nct_title || nctTitle || "",
            level: raw.data.level || "beginner",
            goals: raw.data.goals ?? [],
            stages: raw.data.stages ?? [],
            completed_steps: parseCompletedSteps(raw.data.completed_steps),
            status: raw.data.status as PlanStatus | undefined,
          }
        }
      } catch {
        // if DB is unavailable, we'll fall back
      }

      if (cancelled) return

      if (dbRecord) {
        const dbPlan: DevelopmentPlan = {
          nctCode: dbRecord.nct_code,
          nctTitle: dbRecord.nct_title,
          level: (dbRecord.level as any) || "beginner",
          goals: safeParseJSONArray(dbRecord.goals) as any,
          stages: safeParseJSONArray(dbRecord.stages) as any,
        }

        setPlan(dbPlan)
        setPlanRecordId(dbRecord.id)

        // Merge logic: DB is source of truth only if it has progress
        const dbSteps = dbRecord.completed_steps || []
        const localSteps = (localPlan as any)?.completedSteps || []
        const finalSteps = dbSteps.length > 0 ? dbSteps : localSteps
        const finalStatus = (dbRecord.status ? dbRecord.status : (localPlan?.status as PlanStatus)) || "active"

        setCompletedSteps(finalSteps)
        setStatus(finalStatus)

        const planToUpsert = {
          nctCode: dbPlan.nctCode,
          nctTitle: dbPlan.nctTitle,
          level: dbPlan.level,
          goals: dbPlan.goals,
          stages: dbPlan.stages,
          status: finalStatus,
          completedSteps: finalSteps,
        }

        if (localPlan) {
          upsertPlan(planToUpsert)
        } else if (!generatedLocal.current) {
          upsertPlan(planToUpsert)
        }

        setTodos(deriveTodos(dbPlan))
      } else if (localPlan) {
        // Priority 2: local store as fallback
        setPlan(localPlan as DevelopmentPlan)
        setPlanRecordId(localPlan.id)
        setTodos(deriveTodos(localPlan as any))
        setCompletedSteps(localPlan.completedSteps || [])
        setStatus((localPlan as any).status || "active")
      } else if (!generatedLocal.current) {
        // Priority 3: generate fresh — ONLY if we have never generated locally AND no local plan
        generatedLocal.current = true
        try {
          const resp = await fetch("/api/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nctCode,
              nctTitle: nctTitle || "выбранное направление",
              assessment: { level: "beginner", skills: [], strengths: [], gaps: [] },
            }),
          })
          if (cancelled) return
          const raw = await resp.json()
          if (raw.status === "success" && raw.data) {
            const p = raw.data as DevelopmentPlan
            setPlan(p)
            setTodos(deriveTodos(p))
            const id = upsertPlan({
              nctCode,
              nctTitle: nctTitle || "выбранное направление",
              level: p.level || "beginner",
              goals: p.goals || [],
              stages: p.stages || [],
              status: "active",
              completedSteps: [],
            })
            setPlanRecordId(id)
            logActivityEvent("generate_plan", `Генерация плана для кода: ${nctCode}`)
          } else if (raw.status === "error") {
            setError(raw.error)
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка сети")
        }
      }

      if (!cancelled) setLoading(false)
    }

    initPlan()

    return () => {
      cancelled = true
    }
    // We intentionally run this only on mount per nctCode.
    // plans and upsertPlan are excluded to prevent infinite loops when the store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nctCode, nctTitle])

  const handleToggle = useCallback(
    async (todoId: string) => {
      if (!plan || !planRecordId) return
      if (status !== "active") return

      const newSteps = completedSteps.includes(todoId)
        ? completedSteps.filter((id) => id !== todoId)
        : [...completedSteps, todoId]

      setCompletedSteps(newSteps)
      setStatus("active")

      const planUpdate = {
        nctCode: plan.nctCode,
        nctTitle: plan.nctTitle,
        level: plan.level,
        goals: plan.goals,
        stages: plan.stages,
        status: "active",
        completedSteps: newSteps,
      }
      upsertPlan(planUpdate)

      await pendingSave(todoId, newSteps, "active")

      logActivityEvent("complete_plan_step", `Выполнен шаг плана ${nctCode}`)
    },
    [completedSteps, plan, planRecordId, nctCode, pendingSave, upsertPlan],
  )

  const allCompleted = todos.length > 0 && completedSteps.length === todos.length

  const handleStartTest = async () => {
    if (!plan) return
    setTestLoading(true)
    try {
      const res = await fetch("/api/plan/test-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode: plan.nctCode,
          nctTitle: plan.nctTitle,
          level: plan.level,
          goals: plan.goals,
          stages: plan.stages,
        }),
      })
      const result = await res.json()
      if (result.status === "success" && Array.isArray(result.questions) && result.questions.length > 0) {
        setTestQuestions(result.questions)
        setShowTest(true)
        const testingStatus: PlanStatus = "testing"
        setStatus(testingStatus)
        setCompletedSteps((prev) => {
          const updated = [...prev]
          upsertPlan({
            nctCode: plan.nctCode,
            nctTitle: plan.nctTitle,
            level: plan.level,
            goals: plan.goals,
            stages: plan.stages,
            status: testingStatus,
            completedSteps: updated,
          })
          return updated
        })
        logActivityEvent("test_plan", `Начато тестирование плана ${nctCode}`)
      } else {
        setError("Не удалось сгенерировать вопросы")
      }
    } catch {
      setError("Ошибка сети при генерации вопросов")
    } finally {
      setTestLoading(false)
    }
  }

  const handleTestComplete = async (answers: PlanTestAnswer[]) => {
    if (!plan) return
    setEvaluating(true)
    try {
      const res = await fetch("/api/plan/test-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode: plan.nctCode,
          nctTitle: plan.nctTitle,
          level: plan.level,
          goals: plan.goals,
          stages: plan.stages,
          answers,
        }),
      })
      const result = await res.json()
      if (result.status === "success" && result.evaluation) {
        const newStatus: PlanStatus = result.evaluation.passed ? "completed" : "failed"
        setStatus(newStatus)
        setEvaluation(result.evaluation)
        setShowTest(false)

        setCompletedSteps((prev) => {
          upsertPlan({
            nctCode: plan.nctCode,
            nctTitle: plan.nctTitle,
            level: result.evaluation.newLevel || plan.level,
            goals: plan.goals,
            stages: plan.stages,
            status: newStatus,
            completedSteps: prev,
          })
          return prev
        })

        await fetch("/api/plan/todos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nctCode, completedSteps, status: newStatus }),
        })

        if (result.evaluation.passed) {
          logActivityEvent("complete_plan", `План завершён: ${nctCode}`)
          if (result.evaluation.newLevel) {
            setLevel(result.evaluation.newLevel)
          }
        }
      } else {
        setError("Не удалось оценить ответы")
      }
    } catch {
      setError("Ошибка сети при оценке")
    } finally {
      setEvaluating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!plan || !evaluation) return
    setRegenerating(true)
    try {
      const res = await fetch("/api/plan/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode: plan.nctCode,
          nctTitle: plan.nctTitle,
          level: plan.level,
          goals: plan.goals,
          stages: plan.stages,
          assessment: { level: plan.level, skills: [], strengths: [], gaps: [] },
          testMessage: evaluation.message,
        }),
      })
      const result = await res.json()
      if (result.status === "success" && result.data) {
        const newPlan = result.data as DevelopmentPlan
        setPlan(newPlan)
        setTodos(deriveTodos(newPlan))
        setCompletedSteps([])
        setStatus("active")
        setEvaluation(null)
        generatedLocal.current = true
        const id = upsertPlan({
          nctCode: newPlan.nctCode,
          nctTitle: newPlan.nctTitle,
          level: newPlan.level,
          goals: newPlan.goals,
          stages: newPlan.stages,
          status: "active",
          completedSteps: [],
        })
        setPlanRecordId(id)
        logActivityEvent("regenerate_plan", `План обновлён: ${nctCode}`)
      }
    } catch {
      setError("Не удалось создать новый план")
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-text-secondary">Загрузка плана...</p>
      </main>
    )
  }

  if (error && !plan) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="text-sm font-medium text-error">Не удалось загрузить план</p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Попробовать снова
          </button>
        </motion.div>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <p className="text-sm text-text-secondary">План не найден</p>
      </main>
    )
  }

  const progress = todos.length > 0 ? Math.round((completedSteps.length / todos.length) * 100) : 0
  const levelLabel =
    plan.level === "beginner" ? "Начальный" : plan.level === "intermediate" ? "Средний" : "Продвинутый"
  const isActive = status === "active"
  const isCompleted = status === "completed"
  const isFailed = status === "failed"

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
            aria-label="Назад"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div className="flex-1">
            <span className="text-xs font-semibold tracking-wide text-primary">{plan.nctCode}</span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">План развития</h1>
            <p className="mt-1 text-xs text-text-muted">{plan.nctTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <CheckCircle className="h-3.5 w-3.5" />
                Завершён
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1.5 text-xs font-semibold text-error">
                <Clock className="h-3.5 w-3.5" />
                Требует доработки
              </span>
            )}
          </div>
        </div>

        {isActive && todos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground">TODO-лист</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Отмечайте выполненные действия
              {savingTodoId && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Сохранение...
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {todos.map((todo) => (
                <PlanTodoItem
                  key={todo.id}
                  id={todo.id}
                  label={todo.label}
                  completed={completedSteps.includes(todo.id)}
                  onToggle={handleToggle}
                  disabled={isCompleted || isFailed}
                />
              ))}
            </div>
          </section>
        )}

        {isActive && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Прогресс выполнения</span>
              <span>
                {completedSteps.length} / {todos.length}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
        )}

        {isActive && (
          <div className="mb-10 flex justify-center">
            <motion.button
              whileHover={allCompleted ? { scale: 1.02 } : undefined}
              whileTap={allCompleted ? { scale: 0.98 } : undefined}
              onClick={handleStartTest}
              disabled={!allCompleted || testLoading}
              className="inline-flex h-12 items-center gap-2.5 rounded-[14px] bg-primary px-8 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FlaskConical className="h-5 w-5" />
              )}
              {allCompleted ? "Протестировать" : "Выполните все действия"}
            </motion.button>
          </div>
        )}

        {isCompleted && (
          <div className="mb-10 rounded-[18px] border border-success/30 bg-success/5 p-8 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-success" />
            <p className="mt-3 text-lg font-semibold text-foreground">План успешно завершён!</p>
            <p className="mt-1 text-sm text-text-secondary">
              {evaluation?.message || "Вы успешно прошли все этапы плана развития."}
            </p>
          </div>
        )}

        <div className="mb-8">
          <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-text-secondary">
            Уровень: {levelLabel}
          </span>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground">Цели</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plan.goals.map((goal, index) => (
              <motion.div
                key={goal.title + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="rounded-[18px] border border-border bg-card-bg p-5"
              >
                <h3 className="text-sm font-semibold text-foreground">{goal.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{goal.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Этапы развития</h2>
          <div className="mt-4 flex flex-col gap-4">
            {plan.stages.map((stage, index) => (
              <PlanCard key={stage.id} stage={stage} index={index} />
            ))}
          </div>
        </section>

        {error && plan && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 mt-10 rounded-[18px] border border-error/30 bg-error/5 p-4 text-center text-sm text-error"
          >
            {error}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showTest && testQuestions.length > 0 && (
          <PlanTestModal
            questions={testQuestions}
            onComplete={handleTestComplete}
            onClose={() => setShowTest(false)}
            loading={evaluating}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {evaluation && !showTest && (
          <PlanResultModal
            evaluation={evaluation}
            onRegenerate={handleRegenerate}
            onClose={() => setEvaluation(null)}
            loading={regenerating}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function PlanSkeleton() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-text-secondary">Загрузка...</p>
    </main>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<PlanSkeleton />}>
      <PlanContent />
    </Suspense>
  )
}
