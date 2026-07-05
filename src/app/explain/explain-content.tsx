"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Target } from "lucide-react"
import { NCTSignalCard } from "@/components/signal-cards/NCTSignalCard"
import { selectRecommendationGoal } from "@/lib/recommendations/selection-client"
import { useAnalysisStore } from "@/stores/analysis-store"
import { useProfileStore } from "@/stores/profile-store"
import type { ActiveGoalBundle } from "@/types/admission"
import type { RecommendationCacheData } from "@/types/recommendations"

type PersistedRecommendationDetail = {
  code: string
  title: string
  confidence: number
  finalScore: number
  explanation: string
  matchedInterests: string[]
  matchedCareers: string[]
  relatedCodes: string[]
  overallConfidence: number
  institution?: string
  city?: string
}

function normalizeCode(value: string) {
  return value.replace(/[\s-]+/g, "").toUpperCase()
}

function toPersistedRecommendationDetail(bundle: ActiveGoalBundle | null, requestedCode: string): PersistedRecommendationDetail | null {
  if (!bundle?.goal || !bundle.recommendationSnapshot) return null

  const normalizedRequestedCode = normalizeCode(requestedCode)
  const normalizedGoalCode = normalizeCode(bundle.goal.nctCode)
  const normalizedSnapshotCode = normalizeCode(bundle.recommendationSnapshot.selection.code)

  if (normalizedRequestedCode !== normalizedGoalCode || normalizedRequestedCode !== normalizedSnapshotCode) {
    return null
  }

  return {
    code: bundle.recommendationSnapshot.selection.code,
    title: bundle.recommendationSnapshot.selection.title,
    confidence: bundle.recommendationSnapshot.selection.confidence,
    finalScore: bundle.recommendationSnapshot.selection.finalScore,
    explanation: bundle.recommendationSnapshot.selection.explanation,
    matchedInterests: bundle.recommendationSnapshot.selection.matchedInterests,
    matchedCareers: bundle.recommendationSnapshot.selection.matchedCareers,
    relatedCodes: bundle.recommendationSnapshot.selection.relatedCodes,
    overallConfidence: bundle.recommendationSnapshot.overallConfidence,
    institution: bundle.goal.university,
    city: bundle.goal.city,
  }
}

export default function ExplainContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = useProfileStore((state) => state.sessionId)
  const setActiveGoal = useProfileStore((state) => state.setActiveGoal)
  const restoreFromCache = useAnalysisStore((state) => state.restoreFromCache)
  const [cache, setCache] = useState<RecommendationCacheData | null>(null)
  const [cacheResolved, setCacheResolved] = useState(false)
  const [persistedDetail, setPersistedDetail] = useState<PersistedRecommendationDetail | null>(null)
  const [persistedResolved, setPersistedResolved] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const code = normalizeCode(searchParams.get("code") ?? "")

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCache(restoreFromCache())
      setCacheResolved(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [restoreFromCache])

  useEffect(() => {
    let cancelled = false

    if (!code) {
      setPersistedDetail(null)
      setPersistedResolved(true)
      return () => {
        cancelled = true
      }
    }

    async function loadPersistedDetail() {
      setPersistedResolved(false)

      try {
        const res = await fetch("/api/plan/full", { cache: "no-store" })
        const payload = await res.json()
        if (!res.ok || payload.status !== "success") {
          throw new Error(payload.error ?? "Failed to load active goal bundle")
        }

        const bundle = (payload.data?.bundle ?? null) as ActiveGoalBundle | null
        if (!cancelled) {
          setPersistedDetail(toPersistedRecommendationDetail(bundle, code))
        }
      } catch {
        if (!cancelled) {
          setPersistedDetail(null)
        }
      } finally {
        if (!cancelled) {
          setPersistedResolved(true)
        }
      }
    }

    void loadPersistedDetail()

    return () => {
      cancelled = true
    }
  }, [code])

  const recommendation = useMemo(
    () => cache?.ranked.find((item) => normalizeCode(item.code) === code) ?? null,
    [cache, code],
  )

  const related = useMemo(() => {
    if (!cache || !recommendation) return []

    return cache.ranked
      .filter((item) => item.code !== recommendation.code && (
        item.branchKey === recommendation.branchKey || item.cluster === recommendation.cluster
      ))
      .slice(0, 3)
  }, [cache, recommendation])

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) router.back()
    else router.push("/recommendations")
  }

  const handleSelect = async () => {
    if (!cache || !recommendation || selecting) return

    setSelecting(true)
    setError(null)

    try {
      const goal = await selectRecommendationGoal({
        recommendation,
        resultSet: cache,
        sessionId,
      })
      setActiveGoal(goal)
      router.push("/plan")
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : "Не удалось выбрать цель")
      setSelecting(false)
    }
  }

  if (!cacheResolved || (!recommendation && !persistedResolved)) {
    return <DetailSkeleton />
  }

  if (!recommendation && !persistedDetail) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-foreground">Рекомендация больше не доступна</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Обновите список рекомендаций, чтобы объяснение и оценка соответствовали текущим данным.
          </p>
          <button
            onClick={() => router.replace("/recommendations")}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Вернуться к рекомендациям
          </button>
        </div>
      </main>
    )
  }

  const scoreSignals = recommendation
    ? [
      { label: "Общая уверенность", value: recommendation.confidence },
      { label: "Смысловое совпадение", value: recommendation.semanticScore },
      { label: "Совпадение по направлению", value: recommendation.taxonomyScore },
    ].filter((signal): signal is { label: string; value: number } => typeof signal.value === "number")
    : [
      { label: "Общая уверенность", value: persistedDetail!.confidence },
      { label: "Итоговый score", value: persistedDetail!.finalScore },
      { label: "Уверенность выдачи", value: persistedDetail!.overallConfidence },
    ]

  return (
    <main className="flex flex-1 flex-col px-6 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 py-6">
        <button
          onClick={goBack}
          aria-label="Вернуться к рекомендациям"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </button>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {recommendation ? `Рекомендация №${recommendation.rank}` : "Сохраненный выбор"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Почему это направление подходит</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {recommendation
              ? "Детали рассчитаны тем же анализом, который сформировал список рекомендаций."
              : "Эти детали восстановлены из сохраненного snapshot выбора цели."}
          </p>
        </header>

        <NCTSignalCard
          code={recommendation?.code ?? persistedDetail!.code}
          title_ru={recommendation?.title_ru ?? persistedDetail!.title}
          institution={recommendation?.institution ?? persistedDetail?.institution ?? "Выбранное учебное заведение"}
          city={recommendation?.city ?? persistedDetail?.city ?? "Город уточняется"}
          confidence={recommendation?.confidence ?? persistedDetail!.confidence}
          career_matches={recommendation?.matchedCareers ?? recommendation?.career_matches ?? persistedDetail!.matchedCareers}
          whyItFits={recommendation?.reasoning ?? persistedDetail!.explanation}
          matchedInterests={recommendation?.matchedInterests ?? persistedDetail!.matchedInterests}
          cluster={recommendation?.cluster}
          taxonomy={recommendation ? {
            cluster_name_ru: recommendation.cluster_name_ru,
            study_form: recommendation.study_form,
            study_type: recommendation.study_type,
          } : undefined}
          variant="compact"
        />

        <section className="rounded-[20px] border border-border bg-card-bg p-6">
          <h2 className="text-base font-semibold text-foreground">Основания рекомендации</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {scoreSignals.map((signal) => (
              <div key={signal.label} className="rounded-[14px] bg-background p-4">
                <p className="text-xs text-text-muted">{signal.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {Math.round(signal.value * 100)}%
                </p>
              </div>
            ))}
          </div>

          {recommendation?.matchedKeywords.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {recommendation.matchedKeywords.slice(0, 6).map((keyword) => (
                <span key={keyword} className="rounded-[8px] border border-border bg-background px-2.5 py-1 text-xs text-text-secondary">
                  {keyword}
                </span>
              ))}
            </div>
          ) : persistedDetail?.relatedCodes.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {persistedDetail.relatedCodes.map((relatedCode) => (
                <span key={relatedCode} className="rounded-[8px] border border-border bg-background px-2.5 py-1 text-xs text-text-secondary">
                  {relatedCode}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {recommendation && related.length > 0 ? (
          <section className="rounded-[20px] border border-border bg-card-bg p-6">
            <h2 className="text-base font-semibold text-foreground">Близкие варианты из этой выдачи</h2>
            <div className="mt-4 space-y-3">
              {related.map((item) => (
                <button
                  key={item.code}
                  onClick={() => router.push(`/explain?code=${encodeURIComponent(item.code)}`)}
                  className="flex min-h-11 w-full items-center justify-between gap-4 rounded-[14px] border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-card-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span>
                    <span className="text-xs font-semibold text-primary">{item.code}</span>
                    <span className="mt-0.5 block text-sm font-medium text-foreground">{item.title_ru}</span>
                  </span>
                  <span className="text-xs tabular-nums text-text-muted">{Math.round(item.confidence * 100)}%</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {error ? <p role="alert" className="text-sm font-medium text-error">{error}</p> : null}

        {recommendation ? (
          <button
            onClick={handleSelect}
            disabled={selecting}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {selecting ? <CheckCircle2 className="h-5 w-5 animate-pulse" /> : <Target className="h-5 w-5" />}
            {selecting ? "Сохраняем цель..." : "Выбрать эту цель"}
          </button>
        ) : (
          <button
            onClick={() => router.push("/plan")}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Target className="h-5 w-5" />
            Вернуться к плану
          </button>
        )}
      </div>
    </main>
  )
}

function DetailSkeleton() {
  return (
    <main className="flex flex-1 flex-col px-6 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 py-6" aria-busy="true">
        <div className="h-11 w-11 animate-pulse rounded-[12px] bg-card-bg" />
        <div className="h-20 animate-pulse rounded-[16px] bg-background" />
        <div className="h-72 animate-pulse rounded-[20px] bg-card-bg" />
        <div className="h-40 animate-pulse rounded-[20px] bg-card-bg" />
      </div>
    </main>
  )
}
