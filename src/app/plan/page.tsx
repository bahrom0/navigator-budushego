"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Bot, Check, Cloud, Loader2, Target } from "lucide-react"
import { PlanCard } from "@/components/plans/PlanCard"
import { useProfileStore } from "@/stores/profile-store"
import { applyActiveGoalBundle } from "@/lib/coach/bundle-client"
import type { CoachGoal } from "@/types/coach"
import type { ActiveGoalBundle } from "@/types/admission"
import type { DevelopmentPlan } from "@/types/plan"

const SafePlanCard = typeof PlanCard === "function" ? PlanCard : FallbackPlanCard

function toGoalFallback(code: string, title: string): CoachGoal {
  return {
    id: `local-${code}`,
    nctCode: code,
    nctTitle: title,
    setAt: Date.now(),
    status: "active",
  }
}

type CachedPlan = DevelopmentPlan & {
  id?: string
  goal_id?: string | null
  roadmap_id?: string | null
}

function PlanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryCode = searchParams.get("code") || ""
  const queryTitle = searchParams.get("title") || ""

  const profileGoal = useProfileStore((s) => s.activeGoal)
  const interviews = useProfileStore((s) => s.interviews)
  const setProfileGoal = useProfileStore((s) => s.setActiveGoal)
  const upsertPlan = useProfileStore((s) => s.upsertPlan)

  const [bundle, setBundle] = useState<ActiveGoalBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedPlan, setCachedPlan] = useState<CachedPlan | null>(null)

  const goal = bundle
    ? bundle.goal
    : profileGoal ?? (queryCode ? toGoalFallback(queryCode, queryTitle || "Выбранное направление") : null)
  const plan = bundle ? bundle.generalPlan : cachedPlan
  const goalCode = goal?.nctCode ?? queryCode
  const goalTitle = goal?.nctTitle ?? queryTitle
  const hasInterviewForGoal = Boolean(goalCode) && interviews.some((interview) => interview.nctCode === goalCode)
  const recommendationSnapshot = bundle?.recommendationSnapshot ?? null
  const saveState: "idle" | "saved" = plan ? "saved" : "idle"
  const coachHref = goal
    ? bundle?.roadmap
      ? "/coach"
      : "/coach?setup=roadmap"
    : `/interview?code=${encodeURIComponent(queryCode)}&title=${encodeURIComponent(queryTitle)}`
  const interviewHref = `/interview?code=${encodeURIComponent(goalCode)}&title=${encodeURIComponent(goalTitle)}`

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.sessionStorage.getItem("pending_generated_plan_v1")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as {
        nctCode?: string
        nctTitle?: string
        plan?: CachedPlan
      }
      if (parsed?.plan && parsed.plan.nctCode && (!queryCode || parsed.plan.nctCode === queryCode)) {
        setCachedPlan(parsed.plan)
        upsertPlan({
          goalId: profileGoal?.id,
          nctCode: parsed.plan.nctCode,
          nctTitle: parsed.plan.nctTitle,
          level: parsed.plan.level,
          goals: parsed.plan.goals,
          stages: parsed.plan.stages,
          status: "active",
          completedSteps: [],
          planType: "general",
        })
      }
    } catch {
      // ignore bad cache
    }
  }, [profileGoal?.id, queryCode, upsertPlan])

  const loadBundle = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/plan/full")
      const payload = await res.json()
      if (!res.ok || payload.status !== "success") {
        throw new Error(payload.error ?? "Не удалось загрузить план")
      }

      const nextBundle = (payload.data?.bundle ?? null) as ActiveGoalBundle | null
      setBundle(nextBundle)

      if (nextBundle) {
        applyActiveGoalBundle(nextBundle)
      }

      const resolvedGoal = nextBundle?.goal
        ?? (!nextBundle && queryCode
          ? toGoalFallback(queryCode, queryTitle || "Выбранное направление")
          : null)

      if (!nextBundle && resolvedGoal) {
        setProfileGoal(resolvedGoal)
      }

      if (nextBundle?.generalPlan) {
        setCachedPlan(nextBundle.generalPlan)
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("pending_generated_plan_v1")
        }
        upsertPlan({
          goalId: resolvedGoal?.id,
          nctCode: nextBundle.generalPlan.nctCode,
          nctTitle: nextBundle.generalPlan.nctTitle,
          level: nextBundle.generalPlan.level,
          goals: nextBundle.generalPlan.goals,
          stages: nextBundle.generalPlan.stages,
          status: "active",
          completedSteps: [],
          planType: "general",
          roadmapId: nextBundle.roadmap?.id,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные")
    } finally {
      setLoading(false)
    }
  }, [queryCode, queryTitle, setProfileGoal, upsertPlan])

  useEffect(() => {
    void loadBundle()
  }, [loadBundle])

  useEffect(() => {
    if (loading || plan || !goalCode || hasInterviewForGoal) return
    router.replace(interviewHref)
  }, [goalCode, hasInterviewForGoal, interviewHref, loading, plan, router])

  if (loading && !goal) {
    return (
      <main className="navigator-page navigator-page--narrow flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    )
  }

  if (error && !goal) {
    return (
      <main className="navigator-page navigator-page--narrow flex flex-1 items-center justify-center py-24">
        <div className="max-w-md text-center">
          <p className="text-sm font-medium text-error">Не удалось загрузить план</p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="navigator-page navigator-page--narrow flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-5xl">
        <div className="navigator-hero mb-8 flex flex-wrap items-start gap-4 p-5 sm:p-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
            aria-label="Назад"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div className="min-w-[15rem] flex-1">
            <span className="navigator-kicker">Изучите план</span>
            <h1 className="navigator-page-title mt-3">План цели</h1>
            <p className="navigator-page-subtitle mt-3">
              {goal ? `${goal.nctTitle} · ${goal.nctCode}` : "Сначала выберите цель и пройдите интервью"}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
              onClick={() =>
                router.push(goal ? coachHref : interviewHref)
              }
              disabled={!goalCode}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40 sm:w-auto"
            >
              <Target className="h-4 w-4" />
              {goal ? "Перейти в Coach" : "Пройти интервью"}
            </button>
          </div>
        </div>

        {recommendationSnapshot && goal ? (
          <section className="navigator-surface mb-6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="navigator-kicker">
                  Почему выбрана эта цель · рекомендация №{recommendationSnapshot.selection.rank}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {recommendationSnapshot.selection.explanation}
                </p>
                {recommendationSnapshot.selection.matchedInterests.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendationSnapshot.selection.matchedInterests.map((interest) => (
                      <span key={interest} className="rounded-[8px] border border-border bg-background px-2.5 py-1 text-xs text-text-secondary">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/explain?code=${encodeURIComponent(goal.nctCode)}`)}
                className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-card-bg"
              >
                Открыть детали
              </button>
            </div>
          </section>
        ) : null}

        {/* {goal ? (
          <section className="navigator-surface mb-6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="navigator-kicker navigator-kicker--muted">
                  Community around the active goal
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  User Chat stays secondary: use it to discuss this code, find peers with the same goal, and compare how others move through preparation without replacing Coach.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/chat?intent=code")}
                  className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-card-bg"
                >
                  Обсудить код
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/chat?intent=goal")}
                  className="inline-flex min-h-11 items-center rounded-[12px] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Найти людей с той же целью
                </button>
              </div>
            </div>
          </section>
        ) : null} */}

        {/* {goal ? (
          <section className="navigator-surface mb-6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="navigator-kicker navigator-kicker--muted">
                  AI Chat as a helper layer
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Используйте AI Chat, чтобы разобраться в шагах общего плана, терминах и темах по выбранной цели. Он помогает понять материал, но не заменяет Coach и не перехватывает следующий шаг.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/teacher?source=plan&stageTitle=${encodeURIComponent(plan?.stages[0]?.title ?? "")}&prompt=${encodeURIComponent(plan?.stages[0] ? `Объясни, как подступиться к этапу "${plan.stages[0].title}".` : `Помоги понять, как проходить общий план по цели ${goal.nctCode}.`)}`)}
                className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-card-bg"
              >
                <Bot className="h-4 w-4" />
                Разобрать план в AI Chat
              </button>
            </div>
          </section>
        ) : null} */}

        {plan ? (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="navigator-section-title">Общий план</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {plan.stages.length} этапов, собранных под вашу цель и уровень знаний
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {saveState === "saved" ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1.5 text-xs font-semibold text-success">
                    <Check className="h-3.5 w-3.5" />
                    Сохранено в Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card-bg px-3 py-1.5 text-xs font-medium text-text-secondary">
                    <Cloud className="h-3.5 w-3.5" />
                    План синхронизируется
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => router.push(coachHref)}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Перейти в Coach
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="navigator-surface p-5">
                <p className="text-sm font-semibold text-foreground">Что нужно подтянуть</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {plan.goals.map((goalItem) => (
                    <div key={goalItem.title} className="rounded-[14px] border border-border bg-background p-4">
                      <p className="text-sm font-semibold text-foreground">{goalItem.title}</p>
                      <p className="mt-2 text-sm text-text-secondary">{goalItem.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {plan.stages.map((stage, index) => (
                  <SafePlanCard key={stage.id} stage={stage} index={index} />
                ))}
              </div>
            </div>
          </section>
        ) : loading ? (
          <div className="navigator-surface p-6 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">Создаём план</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Подождите немного, мы собираем план развития по результатам интервью.
              </p>
            </div>
          </div>
        ) : (
          <EmptyPrompt
            icon={<Target className="h-6 w-6 text-primary" />}
            title="Интервью завершено"
            text="После интервью здесь появится общий план развития. Если план еще не создан, пройдите интервью по выбранному коду."
            actionLabel="Перейти к интервью"
            onAction={() => router.push(interviewHref)}
          />
        )}
      </div>
    </main>
  )
}

function EmptyPrompt({
  icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: ReactNode
  title: string
  text: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="navigator-surface p-5 text-left sm:p-6 sm:text-center"
    >
      <div className="mx-auto flex max-w-[34rem] flex-col items-start sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-light">
          {icon}
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{text}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
        >
          {actionLabel}
        </button>
      </div>
    </motion.div>
  )
}

function FallbackPlanCard({ stage, index }: { stage: DevelopmentPlan["stages"][number]; index: number }) {
  return (
    <div className="navigator-surface p-6">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-text-secondary">
          {index + 1}
        </span>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">{stage.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{stage.description}</p>
        </div>
      </div>
    </div>
  )
}

function PlanSkeleton() {
  return (
    <main className="navigator-page navigator-page--narrow flex flex-1 items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
