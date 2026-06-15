"use client"

import { Suspense, useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, Target } from "lucide-react"
import { useCategoryStore, hydrateCategoryStore } from "@/stores/category-store"
import { useFitScoreStore } from "@/stores/fit-score-store"
import { useProfileStore } from "@/stores/profile-store"
import { FitScoreBreakdown } from "@/components/strategy/FitScoreBreakdown"
import { logActivityEvent } from "@/lib/activity-logger"
import { CATEGORIES } from "@/constants/categories"
import type { FitScoreResult } from "@/types/strategy"
import type { Category } from "@/types/categories"

export default function FitScorePage() {
  return (
    <Suspense fallback={
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="h-28 w-28 animate-pulse rounded-full bg-background" />
      </main>
    }>
      <FitScoreContent />
    </Suspense>
  )
}

function FitScoreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedIds = useCategoryStore((s) => s.selected)
  const setResult = useFitScoreStore((s) => s.setResult)
  const profileLevel = useProfileStore((s) => s.level)
  const profileInterview = useProfileStore((s) => s.interviewResult)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setLocalResult] = useState<FitScoreResult | null>(null)

  const nctCode = searchParams.get("code") ?? ""
  const nctTitle = searchParams.get("title") ?? ""

  const categories = selectedIds
    .map((id) => CATEGORIES.find((c: Category) => c.id === id))
    .filter(Boolean) as Category[]

  const fetchedRef = useRef(false)

  const fetchFitScore = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/fit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nctCode,
          nctTitle,
          categories: categories.map((c) => c.name),
          interviewSummary: profileInterview?.summary,
          userLevel: profileLevel,
          useAI: true,
        }),
      })

      const data = await res.json()

      if (data.status === "error") {
        setError(data.error || "Ошибка получения Fit Score")
        return
      }

      const fitResult = data.data as FitScoreResult
      setLocalResult(fitResult)
      setResult(fitResult)
      logActivityEvent("view_recommendation", "Fit Score")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка сети"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [nctCode, nctTitle, categories, profileInterview, profileLevel, setResult])

  useEffect(() => {
    hydrateCategoryStore()
    if (!nctCode || categories.length === 0) {
      router.replace("/recommendations")
      return
    }
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchFitScore()
    }
  }, [fetchFitScore])

  const goBack = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.history.length > 2) router.back()
      else router.push("/recommendations")
    }
  }, [router])

  const goToStrategy = useCallback(() => {
    router.push("/strategy")
  }, [router])

  if (loading) {
    return (
      <main className="flex flex-1 flex-col px-6">
        <div className="mb-8 flex items-center gap-3">
          <button onClick={goBack} className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background">
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Fit Score</h1>
            <p className="mt-1 text-sm text-text-secondary">Оцениваем ваше соответствие направлению</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-background" />
            <div className="mt-4 mx-auto h-4 w-48 animate-pulse rounded bg-background" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 max-w-lg mx-auto">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-[16px] bg-background" />
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <RefreshCw className="h-7 w-7 text-error" />
          </div>
          <p className="mt-4 text-sm font-medium text-error">Не удалось получить Fit Score</p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button onClick={fetchFitScore} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover">
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
          <button onClick={goBack} className="mt-3 inline-flex h-11 items-center justify-center rounded-[14px] px-6 text-base font-medium text-text-secondary hover:text-foreground">
            Вернуться назад
          </button>
        </motion.div>
      </main>
    )
  }

  if (!result) return null

  return (
    <main className="flex flex-1 flex-col px-6">
      <div className="mb-8 flex items-center gap-3">
        <button onClick={goBack} className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background">
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fit Score</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Оценка соответствия направлению: {nctTitle}
          </p>
        </div>
        <button onClick={goToStrategy} className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
          <Target className="h-4 w-4" />
          К стратегии
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        <FitScoreBreakdown result={result} />
      </div>
    </main>
  )
}
