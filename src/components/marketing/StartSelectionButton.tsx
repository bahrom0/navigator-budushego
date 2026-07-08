"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ArrowRight, Compass, Sparkles, Trash2 } from "lucide-react"
import { createPortal } from "react-dom"
import { Button } from "@/components/Button"
import { resetOnboarding } from "@/stores/onboarding-store"
import { useCoachStore } from "@/stores/coach-store"
import { useProfileStore } from "@/stores/profile-store"

interface StartSelectionButtonProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "ghost"
  showArrow?: boolean
  children: React.ReactNode
}

export function StartSelectionButton({
  className = "",
  size = "lg",
  variant = "primary",
  showArrow = false,
  children,
}: StartSelectionButtonProps) {
  const router = useRouter()

  const activeGoal = useProfileStore((state) => state.activeGoal)
  const plans = useProfileStore((state) => state.plans)
  const clearGoalWorkspace = useProfileStore((state) => state.clearGoalWorkspace)

  const coachGoal = useCoachStore((state) => state.goal)
  const coachPlan = useCoachStore((state) => state.plan)
  const roadmap = useCoachStore((state) => state.roadmap)
  const dayPlan = useCoachStore((state) => state.dayPlan)
  const dailyHistory = useCoachStore((state) => state.dailyHistory)
  const miniTests = useCoachStore((state) => state.miniTests)
  const messages = useCoachStore((state) => state.messages)
  const setActiveTab = useCoachStore((state) => state.setActiveTab)
  const resetCoach = useCoachStore((state) => state.reset)

  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const existingGoal = useMemo(() => {
    if (activeGoal) return activeGoal
    if (coachGoal) return coachGoal

    if (coachPlan?.nctTitle && coachPlan?.nctCode) {
      return {
        nctTitle: coachPlan.nctTitle,
        nctCode: coachPlan.nctCode,
      }
    }

    const firstPlan = plans[0]
    if (firstPlan) {
      return {
        nctTitle: firstPlan.nctTitle,
        nctCode: firstPlan.nctCode,
      }
    }

    if (roadmap?.nctTitle && roadmap?.nctCode) {
      return {
        nctTitle: roadmap.nctTitle,
        nctCode: roadmap.nctCode,
      }
    }

    return null
  }, [activeGoal, coachGoal, coachPlan, plans, roadmap])

  const hasOrphanedWorkspace = Boolean(
    !existingGoal
      && (
        roadmap
        || dayPlan
        || coachPlan
        || plans.length > 0
        || dailyHistory.length > 0
        || miniTests.length > 0
        || messages.length > 0
      ),
  )

  const hasLocalGoalWorkspace = Boolean(existingGoal)

  const proceedToOnboarding = useCallback(() => {
    resetOnboarding()
    router.push("/onboarding")
  }, [router])

  const handleStart = useCallback(() => {
    if (hasOrphanedWorkspace) {
      clearGoalWorkspace()
      resetCoach()
      proceedToOnboarding()
      return
    }

    if (!hasLocalGoalWorkspace) {
      proceedToOnboarding()
      return
    }

    setError(null)
    setConfirmOpen(false)
    setOpen(true)
  }, [
    clearGoalWorkspace,
    hasLocalGoalWorkspace,
    hasOrphanedWorkspace,
    proceedToOnboarding,
    resetCoach,
  ])

  const handleReturn = useCallback(() => {
    setConfirmOpen(false)
    setOpen(false)
    setActiveTab("roadmap")
    router.push("/coach")
  }, [router, setActiveTab])

  const handleRequestDelete = useCallback(() => {
    setError(null)
    setConfirmOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (submitting) return
    setConfirmOpen(false)
    setOpen(false)
  }, [submitting])

  const handleConfirmDelete = useCallback(async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/goals/clear", { method: "POST" })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.status === "error") {
        throw new Error(payload?.error ?? "Не удалось очистить предыдущую цель")
      }

      clearGoalWorkspace()
      resetCoach()
      resetOnboarding()
      setConfirmOpen(false)
      setOpen(false)
      router.push("/onboarding")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось очистить предыдущие данные")
    } finally {
      setSubmitting(false)
    }
  }, [clearGoalWorkspace, resetCoach, router])

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex min-h-screen w-screen items-center justify-center bg-[rgba(15,13,10,0.52)] p-3 backdrop-blur-[12px] sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overflow-x-hidden rounded-[1.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-4 shadow-[0_34px_110px_rgba(30,24,19,0.16)] dark:shadow-[0_34px_110px_rgba(0,0,0,0.44)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.68),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_70%)] sm:h-44" />

            <div className="relative">
              <div className="flex items-start gap-3 text-left sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-[var(--marketing-border)] bg-[var(--marketing-soft)] text-[var(--marketing-accent)] sm:h-14 sm:w-14 sm:rounded-[1.25rem]">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--marketing-muted)] sm:text-xs sm:tracking-[0.24em]">
                    Активная цель уже есть
                  </p>
                  <h2 className="mt-2 text-left text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--marketing-foreground)] sm:mt-3 sm:text-2xl">
                    Перед новым подбором нужно очистить текущий путь
                  </h2>
                  <p className="mt-3 text-left text-sm leading-7 text-[var(--marketing-muted)] sm:text-base">
                    У вас уже есть сохранённое направление, оно будет удалено.
                  </p>
                </div>
              </div>

              {confirmOpen ? (
                <div className="mt-5 rounded-[1.25rem] border border-rose-300/80 bg-[linear-gradient(180deg,rgba(255,244,246,0.99),rgba(255,232,237,0.95))] p-4 text-left shadow-[0_14px_34px_rgba(190,52,85,0.1)] sm:mt-6 sm:p-5 dark:border-rose-200/25 dark:bg-[linear-gradient(180deg,rgba(76,15,23,0.42),rgba(47,10,16,0.34))] dark:shadow-none">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-200/90 bg-rose-200/85 text-rose-800 dark:border-rose-300/25 dark:bg-rose-400/18 dark:text-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-rose-950 dark:text-rose-50">
                        Точно удалить план?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-rose-900 dark:text-rose-100">
                        Это действие необратимо. Старую цель, план и Coach roadmap
                        восстановить будет невозможно.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {existingGoal ? (
                <div className="mt-5 rounded-[1.25rem] border border-[var(--marketing-border)] bg-[var(--marketing-soft)] p-4 sm:mt-6 sm:rounded-[1.5rem] sm:p-5">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="text-left">
                      <p className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--marketing-muted)] sm:text-xs sm:tracking-[0.18em]">
                        Текущее направление
                      </p>
                      <p className="mt-2 text-left text-base font-semibold leading-snug text-[var(--marketing-foreground)] sm:text-lg">
                        {existingGoal.nctTitle}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-3 py-1.5 text-sm font-medium text-[var(--marketing-foreground)]">
                      {existingGoal.nctCode}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-4 sm:rounded-[1.1rem]">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--marketing-foreground)]">
                        <Compass className="h-4 w-4 text-[var(--marketing-accent)]" />
                        Coach и roadmap
                      </div>
                      <p className="mt-2 text-left text-sm leading-6 text-[var(--marketing-muted)]">
                        Вернуться к текущему маршруту и продолжить подготовку без сброса.
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-4 sm:rounded-[1.1rem]">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--marketing-foreground)]">
                        <Trash2 className="h-4 w-4 text-[var(--marketing-accent)]" />
                        Новый подбор
                      </div>
                      <p className="mt-2 text-left text-sm leading-6 text-[var(--marketing-muted)]">
                        Начать новый подбор и создать новую единственную цель вместо старой.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-[1rem] border border-amber-300/40 bg-amber-50/80 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-200/20 dark:bg-amber-500/10 dark:text-amber-100">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:mt-6 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="rounded-2xl border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] text-[var(--marketing-foreground)]"
                  onClick={handleReturn}
                  disabled={submitting}
                >
                  Вернуться
                </Button>
                <Button
                  type="button"
                  size="md"
                  loading={submitting}
                  className={`rounded-2xl text-white ${
                    confirmOpen
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-[var(--marketing-foreground)] hover:bg-[var(--marketing-accent)]"
                  }`}
                  onClick={confirmOpen ? handleConfirmDelete : handleRequestDelete}
                >
                  {confirmOpen ? <Trash2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {confirmOpen ? "Удалить навсегда" : "Продолжить"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleStart}
      >
        {children}
        {showArrow ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>

      {mounted ? createPortal(modal, document.body) : null}
    </>
  )
}
