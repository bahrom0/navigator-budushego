"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import type { DevelopmentPlan } from "@/types/plan"
import { PlanCard } from "@/components/plans/PlanCard"
import { SavePlanButton } from "@/components/plans/SavePlanButton"
import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"

function PlanContent() {
  const searchParams = useSearchParams()
  const nctCode = searchParams.get("code") || ""
  const nctTitle = searchParams.get("title") || ""
  const upsertPlan = useProfileStore((s) => s.upsertPlan)

  const [plan, setPlan] = useState<DevelopmentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nctCode) return

    const fetchPlan = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nctCode,
            nctTitle: nctTitle || "выбранное направление",
            assessment: {
              level: "beginner",
              skills: [],
              strengths: [],
              gaps: [],
            },
          }),
        })

        const result = await res.json()
        if (result.status === "error") {
          setError(result.error)
        } else         if (result.data) {
          setPlan(result.data)
          upsertPlan({
            nctCode,
            nctTitle: nctTitle || "выбранное направление",
            level: result.data.level || "beginner",
            goals: result.data.goals || [],
            stages: result.data.stages || [],
          })
          logActivityEvent("generate_plan", `Генерация плана для кода: ${nctCode}`)
          logActivityEvent("save_plan", `План сохранён для кода: ${nctCode}`)
        } else {
          setError("Пустой ответ от сервера")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сети")
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [nctCode, nctTitle])

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-text-secondary">Генерируем план развития...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="text-sm font-medium text-error">Не удалось загрузить план</p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <RefreshCw className="h-4 w-4" />
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

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto max-w-4xl w-full">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
            aria-label="Назад"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div>
            <span className="text-xs font-semibold tracking-wide text-primary">{plan.nctCode}</span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">План развития</h1>
            <p className="mt-1 text-xs text-text-muted">{plan.nctTitle}</p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-text-secondary">
            Уровень: {plan.level === "beginner" ? "Начальный" : plan.level === "intermediate" ? "Средний" : "Продвинутый"}
          </span>
          <SavePlanButton nctCode={plan.nctCode} nctTitle={plan.nctTitle} />
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
      </div>
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
