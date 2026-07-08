"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, CalendarDays, CheckCircle2, Flag, MapPinned } from "lucide-react"
import { CoachOverviewCard } from "@/components/coach/CoachOverviewCard"
import { applyActiveGoalBundle } from "@/lib/coach/bundle-client"
import { fetchActiveGoalBundle } from "@/lib/active-goal-bundle-client"
import type { ActiveGoalBundle } from "@/types/admission"

function getNextStep(bundle: ActiveGoalBundle | null): { label: string; href: string; helper: string } {
  if (!bundle?.goal) {
    return {
      label: "Выбрать цель",
      href: "/recommendations",
      helper: "Сначала закрепите одно направление, чтобы план и Coach работали вокруг него.",
    }
  }

  if (!bundle.generalPlan) {
    return {
      label: "Собрать общий план",
      href: "/plan",
      helper: "Цель уже выбрана. Следующий шаг — превратить ее в понятный общий план.",
    }
  }

  if (!bundle.roadmap) {
    return {
      label: "Открыть Coach",
      href: "/coach",
      helper: "Общий план готов. Теперь нужно развернуть его в roadmap и ежедневные шаги.",
    }
  }

  return {
    label: "Продолжить Coach",
    href: "/coach",
    helper: bundle.todayPlan
      ? "Сохранённые данные удалятся!"
      : "Roadmap готов. Следующий лучший шаг — собрать план на сегодня в Coach.",
  }
}

export default function DashboardOverview() {
  const [bundle, setBundle] = useState<ActiveGoalBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const nextBundle = await fetchActiveGoalBundle()
        if (cancelled) return
        setBundle(nextBundle)
        if (nextBundle) {
          applyActiveGoalBundle(nextBundle)
        }
      } catch {
        if (!cancelled) {
          setBundle(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const completedToday = bundle?.todayPlan?.tasks.filter((task) => task.completed).length ?? 0
  const totalToday = bundle?.todayPlan?.tasks.length ?? 0
  const roadmapWeeks = bundle?.roadmap?.weeks.length ?? 0
  const progressPercent = bundle?.historySummary.tasksTotal
    ? Math.round((bundle.historySummary.tasksCompleted / bundle.historySummary.tasksTotal) * 100)
    : 0
  const nextStep = getNextStep(bundle)

  const stats = useMemo(() => ([
    {
      label: "Активная цель",
      value: bundle?.goal?.nctCode ?? "—",
      hint: bundle?.goal?.nctTitle ?? "Цель пока не выбрана",
      icon: Flag,
    },
    {
      label: "Прогресс по Coach",
      value: `${progressPercent}%`,
      hint: bundle?.historySummary.tasksTotal
        ? `${bundle.historySummary.tasksCompleted} из ${bundle.historySummary.tasksTotal} задач завершено`
        : "Прогресс появится после roadmap и задач Coach",
      icon: CheckCircle2,
    },
    {
      label: "Сегодня",
      value: totalToday > 0 ? `${completedToday}/${totalToday}` : "—",
      hint: totalToday > 0 ? "Задач выполнено сегодня" : "План на сегодня еще не собран",
      icon: CalendarDays,
    },
    {
      label: "Roadmap",
      value: roadmapWeeks > 0 ? String(roadmapWeeks) : "—",
      hint: roadmapWeeks > 0 ? "Недель в маршруте" : "Roadmap еще не создан",
      icon: MapPinned,
    },
  ]), [bundle, completedToday, progressPercent, roadmapWeeks, totalToday])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Обзор</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Дашборд показывает, куда движется активная цель и какой следующий лучший шаг.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-[18px] border border-border bg-card-bg p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold text-foreground">{loading ? "…" : stat.value}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">{stat.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[20px] border border-border bg-card-bg p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Следующий шаг</p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">
            {bundle?.goal ? bundle.goal.nctTitle : "Соберите активную цель"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {nextStep.helper}
          </p>

          {bundle?.history.length ? (
            <div className="mt-6 rounded-[16px] bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Последнее значимое событие</p>
              <p className="mt-2 text-sm text-foreground">{bundle.history[0].title}</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {bundle.history[0].summary ?? "История решений и прогресса теперь собрана в одном месте."}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={nextStep.href}
              className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {nextStep.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/history"
              className="inline-flex items-center gap-2 rounded-[12px] border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card-bg"
            >
              Открыть history
            </Link>
          </div>
        </section>

        <CoachOverviewCard />
      </div>
    </div>
  )
}
