"use client"

import { useEffect, useCallback, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Search, ArrowLeft, RefreshCw, ArrowUpDown, SlidersHorizontal } from "lucide-react"
import { logActivityEvent } from "@/lib/activity-logger"
import {
  useCategoryStore,
  hydrateCategoryStore,
  persistCategories,
} from "@/stores/category-store"
import { hydrateOnboardingStore, useOnboardingStore } from "@/stores/onboarding-store"
import { useProfileStore } from "@/stores/profile-store"
import { CATEGORIES } from "@/constants/categories"
import { NCTSignalCard } from "@/components/signal-cards/NCTSignalCard"
import type { Category } from "@/types/categories"
import { useAnalysisStore } from "@/stores/analysis-store"
import { selectRecommendationGoal } from "@/lib/recommendations/selection-client"
import type {
  CanonicalRecommendation,
  RecommendationCacheData,
  RecommendationResultSet,
} from "@/types/recommendations"

type SortField = "confidence" | "institution"
type SortDir = "asc" | "desc"

export default function RecommendationsPage() {
  const router = useRouter()
  const cacheRestoredRef = useRef(false)

  const selectedIds = useCategoryStore((s) => s.selected)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<CanonicalRecommendation[]>([])
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortField>("confidence")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [cityFilter, setCityFilter] = useState<string>("")
  const [studyFormFilter, setStudyFormFilter] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const cacheResults = useAnalysisStore((s) => s.cacheResults)
  const restoreFromCache = useAnalysisStore((s) => s.restoreFromCache)
  const [cacheRef, setCacheRef] = useState<RecommendationCacheData | null>(null)
  const onboardingLoaded = useOnboardingStore((s) => s._loaded)
  const sessionId = useProfileStore((s) => s.sessionId)
  const setActiveGoal = useProfileStore((s) => s.setActiveGoal)

  const categories = useMemo(() => selectedIds
    .map((id: string) => CATEGORIES.find((c: Category) => c.id === id))
    .filter(Boolean) as Category[],
  [selectedIds]
  )

  const fetchResults = useCallback(
    async (skipCache = false) => {
      setLoading(true)
      setError(null)

      try {
        if (!skipCache) {
          const cached = restoreFromCache()
          if (cached?.decisionContext && Array.isArray(cached.ranked)) {
            setResults(cached.ranked)
            setOverallConfidence(cached.overallConfidence ?? null)
            setCacheRef(cached)
            setLoading(false)
            logActivityEvent("view_recommendation", "Из кэша")
            return
          }
        }

        const onboardingData = useOnboardingStore.getState().data
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories: categories.map((c): { id: string; name: string; description?: string } => ({ id: c.id, name: c.name, description: c.description ?? "" })),
            topK: 8,
            minConfidence: 0.3,
            onboarding: {
              userCity: onboardingData.userCity,
              studyCity: onboardingData.studyCity,
              userType: onboardingData.userType,
              educationLevel: onboardingData.educationLevel,
              interests: onboardingData.interests,
            },
          }),
        })

        const data = await res.json()

        if (data.status === "error") {
          setError(data.error || "Ошибка анализа")
          return
        }

      const resultSet = data.data as RecommendationResultSet
      const payload: RecommendationCacheData = {
        ...resultSet,
        ranked: data.data.ranked || [],
        overallConfidence: data.data.overallConfidence ?? null,
        categories: categories.map((c): { id: string; name: string; description?: string } => ({ id: c.id, name: c.name, description: c.description ?? "" })),
      }

        setResults(payload.ranked)
        setOverallConfidence(payload.overallConfidence)
        setCacheRef(payload)
        cacheResults(payload)
        logActivityEvent("view_recommendation", `Категории: ${categories.map((c) => c.name).join(", ")}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ошибка сети"
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [categories, cacheResults, restoreFromCache]
  )

  useEffect(() => {
    hydrateOnboardingStore()
  }, [])

  useEffect(() => {
    if (!onboardingLoaded) return

    const cached = restoreFromCache()
    if (cached?.decisionContext && Array.isArray(cached.ranked) && cached.ranked.length > 0) {
      const timeoutId = window.setTimeout(() => {
        setResults(cached.ranked)
        setOverallConfidence(cached.overallConfidence ?? null)
        setCacheRef(cached)
        setLoading(false)
        cacheRestoredRef.current = true
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    const restored = hydrateCategoryStore()

    if (categories.length === 0 && !restored && !cached?.ranked?.length) {
      router.replace("/categories")
      return
    }

    const fetchedRef = { current: false }
    async function init() {
      if (fetchedRef.current) return
      fetchedRef.current = true

      if (!cacheRestoredRef.current && categories.length > 0) {
        await fetchResults()
        cacheRestoredRef.current = true
      }
    }

    init()
  }, [categories.length, router, fetchResults, onboardingLoaded, restoreFromCache])

  useEffect(() => {
    persistCategories()
  }, [selectedIds])

  const handleRetry = useCallback(() => {
    setCacheRef(null)
    cacheRestoredRef.current = false
    fetchResults(true)
    logActivityEvent("view_recommendation", "Повторная загрузка")
  }, [fetchResults])

  const goBack = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.history.length > 2) router.back()
      else router.push("/categories")
    }
  }, [router])

const uniqueCities = useMemo(() => {
  const set = new Set<string>()
  results.forEach((r) => { if (r.city) set.add(r.city) })
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}, [results])

const uniqueStudyForms = useMemo(() => {
  const set = new Set<string>()
  results.forEach((r) => {
    const forms = Array.isArray(r.study_form) ? r.study_form : (r.study_form ? [r.study_form] : [])
    forms.forEach((f: string) => { if (f) set.add(f) })
  })
  return Array.from(set).sort()
}, [results])

const displayedResults = useMemo(() => {
  let filtered = results.slice()

  if (cityFilter) {
    filtered = filtered.filter((r) => r.city === cityFilter)
  }
  if (studyFormFilter) {
    filtered = filtered.filter((r) => {
      const raw = r.study_form
      const forms = Array.isArray(raw) ? raw : raw ? [raw] : []
      return forms.includes(studyFormFilter)
    })
  }

  const sorted = filtered.slice().sort((a, b) => {
    if (sortBy === "confidence") {
      const av = a.confidence ?? 0
      const bv = b.confidence ?? 0
      return sortDir === "asc" ? av - bv : bv - av
    }
    if (sortBy === "institution") {
      const av = (a.institution || "").localeCompare(b.institution || "")
      return sortDir === "asc" ? av : -av
    }
    return 0
  })

  return sorted
}, [results, sortBy, sortDir, cityFilter, studyFormFilter])

  const toggleSortDir = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
  }

  const handleSelectGoal = useCallback(
    async (result: CanonicalRecommendation) => {
      try {
        if (!cacheRef?.decisionContext) {
          throw new Error("Контекст рекомендации устарел. Обновите список и выберите цель снова.")
        }
        const goal = await selectRecommendationGoal({
          recommendation: result,
          resultSet: cacheRef,
          sessionId,
          filters: {
            city: cityFilter || undefined,
            studyForm: studyFormFilter || undefined,
            sortBy,
            sortDir,
          },
        })
        setActiveGoal(goal)
        logActivityEvent("coach_goal_set", `Активная цель: ${result.code} - ${result.title_ru}`)
        router.push(`/interview?code=${encodeURIComponent(result.code)}&title=${encodeURIComponent(result.title_ru)}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось выбрать цель")
      }
    },
    [cacheRef, cityFilter, router, sessionId, setActiveGoal, sortBy, sortDir, studyFormFilter],
  )

function SkeletonCard() {
  return (
    <div className="rounded-[20px] border border-border bg-card-bg p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-block h-6 w-24 animate-pulse rounded-[8px] bg-background" />
        <span className="inline-block h-6 w-28 animate-pulse rounded-full bg-background" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-5 w-3/4 animate-pulse rounded bg-background" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-background" />
      </div>
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-background" />
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: 3 }).map((_, j) => (
          <span key={j} className="inline-block h-6 w-16 animate-pulse rounded-[8px] bg-background" />
        ))}
      </div>
      <div className="mt-5 h-20 animate-pulse rounded-[12px] bg-background" />
      <div className="mt-5 flex gap-3 border-t border-border pt-4">
        <span className="inline-block h-10 w-10 animate-pulse rounded-[12px] bg-background" />
        <span className="inline-block h-10 w-28 animate-pulse rounded-[12px] bg-background" />
        <span className="inline-block h-10 w-32 animate-pulse rounded-[12px] bg-background" />
      </div>
    </div>
  )
}

if (!onboardingLoaded || loading) {
    return (
      <main className="navigator-page flex flex-1 flex-col">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={goBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div>
            <h1 className="navigator-page-title">Рекомендации</h1>
            <p className="mt-1 text-sm text-text-secondary">Подбираем специальности на основе выбранных направлений. Следующий шаг здесь один: выбрать одну цель.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 24, delay: i * 0.05 }}
            >
              <SkeletonCard />
            </motion.div>
          ))}
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="navigator-page flex flex-1 flex-col items-center justify-center py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <Search className="h-7 w-7 text-error" />
          </div>
          <p className="mt-4 text-sm font-medium text-error">Не удалось получить рекомендации</p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
          <button
            onClick={goBack}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-[14px] px-6 text-base font-medium text-text-secondary hover:text-foreground"
          >
            Вернуться назад
          </button>
        </motion.div>
      </main>
    )
  }

  if (results.length === 0) {
    return (
      <main className="navigator-page flex flex-1 flex-col items-center justify-center py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">Подходящих направлений не найдено</p>
          <p className="mt-2 text-sm text-text-secondary">
            Попробуйте выбрать другие категории или расширьте критерии поиска.
          </p>
          <button
            onClick={goBack}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover"
          >
            Вернуться к выбору
          </button>
        </motion.div>
      </main>
    )
  }

return (
  <main className="navigator-page flex flex-1 flex-col">
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="navigator-hero mb-6 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={goBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-card-bg/85 transition-colors hover:bg-background"
            >
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <div>
              <span className="navigator-kicker">Выбор</span>
              <h1 className="navigator-page-title mt-3">Рекомендации для выбора цели</h1>
              <p className="navigator-page-subtitle mt-3">
                Подобрано {displayedResults.length}{cityFilter || studyFormFilter ? ` из ${results.length}` : ""} направлений. Сейчас главное действие одно: выбрать одну цель и только потом уходить в детали, explain и план.
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-border bg-card-bg/85 px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <SlidersHorizontal className="h-4 w-4 text-text-muted" />
            Фильтры
          </motion.button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <span className="navigator-chip">Следующий шаг: выбрать 1 цель</span>
          <span className="navigator-chip">Фокус: core path, а не вторичные ветки</span>
          {overallConfidence !== null ? (
            <span className="navigator-chip">Общая уверенность {Math.round(overallConfidence * 100)}%</span>
          ) : null}
        </div>
      </div>
    </motion.section>

    <AnimatePresence>
      {showFilters && (
        <motion.div
          key="filters"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="mb-6 overflow-hidden"
        >
          <div className="navigator-surface grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">Город</span>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-10 rounded-[12px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">Все города</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">Форма обучения</span>
              <select
                value={studyFormFilter}
                onChange={(e) => setStudyFormFilter(e.target.value)}
                className="h-10 rounded-[12px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">Все формы</option>
                {uniqueStudyForms.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">Сортировка</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy("confidence")}
                  className={`inline-flex h-10 flex-1 items-center justify-center rounded-[12px] border text-sm font-medium transition-colors ${
                    sortBy === "confidence"
                      ? "border-primary bg-primary-light/60 text-primary"
                      : "border-border bg-background text-foreground hover:bg-card-bg"
                  }`}
                >
                  Уверенность
                </button>
                <button
                  onClick={() => setSortBy("institution")}
                  className={`inline-flex h-10 flex-1 items-center justify-center rounded-[12px] border text-sm font-medium transition-colors ${
                    sortBy === "institution"
                      ? "border-primary bg-primary-light/60 text-primary"
                      : "border-border bg-background text-foreground hover:bg-card-bg"
                  }`}
                >
                  Вуз
                </button>
                <button
                  onClick={toggleSortDir}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
                  aria-label={sortDir === "asc" ? "По возрастанию" : "По убыванию"}
                >
                  <ArrowUpDown className="h-4 w-4 text-text-muted" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {displayedResults.length === 0 ? (
      <section className="flex flex-1 flex-col items-center justify-center py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">Ничего не найдено по фильтрам</p>
          <p className="mt-2 text-sm text-text-secondary">
            Попробуйте изменить параметры фильтров или сбросить их.
          </p>
          <button
            onClick={() => { setCityFilter(""); setStudyFormFilter(""); }}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover"
          >
            Сбросить фильтры
          </button>
        </motion.div>
      </section>
    ) : (
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {displayedResults.map((result, idx) => (
            <motion.div
              key={`${result.code}-${idx}-${result.institution}`}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 24,
                delay: idx * 0.03,
              }}
            >
              <NCTSignalCard
                code={result.code}
                title_ru={result.title_ru}
                institution={result.institution}
                city={result.city}
                confidence={result.confidence}
                career_matches={result.career_matches}
                whyItFits={result.reasoning}
                matchedInterests={result.matchedInterests || []}
                cluster={result.cluster}
                taxonomy={{
                  cluster_name_ru: result.cluster_name_ru,
                  study_form: result.study_form,
                  study_type: result.study_type,
                }}
                index={idx}
                onSelect={() => handleSelectGoal(result)}
              />
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>
    )}
  </main>
)
}
