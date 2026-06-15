"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, ClipboardList } from "lucide-react"
import { useCategoryStore, hydrateCategoryStore } from "@/stores/category-store"
import { useStrategyStore } from "@/stores/strategy-store"
import { useProfileStore } from "@/stores/profile-store"
import { StrategyCards } from "@/components/strategy/StrategyCards"
import { RouteSimulation } from "@/components/strategy/RouteSimulation"
import { logActivityEvent } from "@/lib/activity-logger"
import { CATEGORIES } from "@/constants/categories"
import type { StrategyResult, RouteSimulation as RouteSimType } from "@/types/strategy"
import type { Category } from "@/types/categories"

export default function StrategyPage() {
  const router = useRouter()
  const selectedIds = useCategoryStore((s) => s.selected)
  const setResult = useStrategyStore((s) => s.setResult)
  const setSimulation = useStrategyStore((s) => s.setSimulation)
  const profileLevel = useProfileStore((s) => s.level)
  const profileInterview = useProfileStore((s) => s.interviewResult)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setLocalResult] = useState<StrategyResult | null>(null)
  const [simulation, setLocalSimulation] = useState<RouteSimType | null>(null)

  const categories = selectedIds
    .map((id) => CATEGORIES.find((c: Category) => c.id === id))
    .filter(Boolean) as Category[]

  const fetchedRef = useRef(false)

  const fetchStrategy = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const interviewSummary = profileInterview?.summary

      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: categories.map((c) => c.name),
          level: profileLevel,
          interviewSummary,
          useAI: true,
        }),
      })

      const data = await res.json()

      if (data.status === "error") {
        setError(data.error || "Ошибка получения стратегии")
        return
      }

      const strategyResult = data.data as StrategyResult
      setLocalResult(strategyResult)
      setResult(strategyResult)

      const topCodes = strategyResult.strategies.flatMap((s) =>
        s.recommendedCodes.map((c) => ({ code: c.code, title: c.title, institution: c.institution })),
      )

      const { simulateRoute } = await import("@/features/strategy/route-simulation")
      const routeSim = simulateRoute({
        categories: categories.map((c) => c.name),
        topCodes,
      })

      setLocalSimulation(routeSim)
      setSimulation(routeSim)
      logActivityEvent("generate_plan", "Стратегия поступления")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка сети"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [categories, profileLevel, profileInterview, setResult, setSimulation])

  useEffect(() => {
    hydrateCategoryStore()
    if (categories.length === 0) {
      router.replace("/categories")
      return
    }
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchStrategy()
    }
  }, [fetchStrategy])

  const goBack = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.history.length > 2) router.back()
      else router.push("/recommendations")
    }
  }, [router])

  const goToPlan = useCallback(() => {
    router.push("/plan")
  }, [router])

  if (loading) {
    return (
      <main className="flex flex-1 flex-col px-6">
        <div className="mb-8 flex items-center gap-3">
          <button onClick={goBack} className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background">
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Стратегия поступления</h1>
            <p className="mt-1 text-sm text-text-secondary">Анализируем ваши данные и строим стратегию</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[20px] border border-border bg-card-bg p-6">
              <div className="h-20 animate-pulse rounded-lg bg-background" />
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-background" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-background" />
              <div className="mt-5 space-y-2">
                <div className="h-12 animate-pulse rounded-[12px] bg-background" />
                <div className="h-12 animate-pulse rounded-[12px] bg-background" />
              </div>
            </div>
          ))}
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
          <p className="mt-4 text-sm font-medium text-error">Не удалось построить стратегию</p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button onClick={fetchStrategy} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover">
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

  if (!result || !simulation) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">Нет данных для стратегии</p>
          <p className="mt-2 text-sm text-text-secondary">Пройдите анализ интересов, чтобы получить персональную стратегию поступления.</p>
          <button onClick={() => router.push("/categories")} className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover">
            Начать анализ
          </button>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col px-6">
      <div className="mb-8 flex items-center gap-3">
        <button onClick={goBack} className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background">
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Стратегия поступления</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Персональная стратегия на основе ваших интересов и уровня подготовки
          </p>
        </div>
        <button onClick={goToPlan} className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">
          <ClipboardList className="h-4 w-4" />
          К плану развития
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Варианты стратегий</h2>
        <StrategyCards strategies={result.strategies} />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Маршрут поступления</h2>
        <RouteSimulation simulation={simulation} />
      </div>
    </main>
  )
}
