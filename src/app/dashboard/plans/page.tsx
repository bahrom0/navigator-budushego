"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Search, ArrowUpDown, ExternalLink, CheckCircle2, GitBranch, Target } from "lucide-react"
import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"

type SortKey = "newest" | "oldest" | "level"

function getPlanProgress(plan: { completedSteps: string[]; stages: { id: string }[] }) {
  const total = plan.stages.length
  const completed = plan.completedSteps.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, percent }
}

export default function DashboardPlans() {
  const plans = useProfileStore((store) => store.plans)
  const activeGoalId = useProfileStore((store) => store.activeGoalId)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()
    let result = plans

    if (query) {
      result = result.filter((plan) =>
        plan.nctTitle.toLowerCase().includes(query) || plan.nctCode.toLowerCase().includes(query),
      )
    }

    return [...result].sort((left, right) => {
      if (sort === "newest") return right.createdAt - left.createdAt
      if (sort === "oldest") return left.createdAt - right.createdAt
      const order = { beginner: 0, intermediate: 1, advanced: 2 }
      return order[right.level] - order[left.level]
    })
  }, [plans, search, sort])

  const planStats = useMemo(() => {
    const withRoadmap = plans.filter((plan) => Boolean(plan.roadmapId)).length
    const linkedToGoal = plans.filter((plan) => Boolean(plan.goalId)).length
    const activeGoalPlans = plans.filter((plan) => plan.goalId && plan.goalId === activeGoalId).length
    return {
      total: plans.length,
      withRoadmap,
      linkedToGoal,
      activeGoalPlans,
    }
  }, [activeGoalId, plans])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Планы развития</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Здесь важнее связь плана с активной целью и roadmap, чем декоративные статусы.
        </p>
      </motion.div>

      {plans.length > 0 ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[14px] border border-border bg-card-bg p-4">
              <p className="text-xs text-text-muted">Всего планов</p>
              <p className="mt-1 text-xl font-bold text-foreground">{planStats.total}</p>
            </div>
            <div className="rounded-[14px] border border-border bg-card-bg p-4">
              <p className="text-xs text-text-muted">Привязаны к goal</p>
              <p className="mt-1 text-xl font-bold text-foreground">{planStats.linkedToGoal}</p>
            </div>
            <div className="rounded-[14px] border border-border bg-card-bg p-4">
              <p className="text-xs text-text-muted">Есть roadmap</p>
              <p className="mt-1 text-xl font-bold text-primary">{planStats.withRoadmap}</p>
            </div>
            <div className="rounded-[14px] border border-border bg-card-bg p-4">
              <p className="text-xs text-text-muted">По активной цели</p>
              <p className="mt-1 text-xl font-bold text-foreground">{planStats.activeGoalPlans}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по названию или коду..."
                className="h-10 w-full rounded-[12px] border border-border bg-card-bg pl-9 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setSort((current) => (current === "newest" ? "oldest" : current === "oldest" ? "level" : "newest"))}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-border bg-card-bg px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sort === "newest" ? "Новые" : sort === "oldest" ? "Старые" : "Уровень"}
            </button>
          </div>
        </>
      ) : null}

      {filtered.length === 0 && plans.length > 0 ? (
        <div className="mt-8 rounded-[18px] border border-border bg-background p-8 text-center">
          <p className="text-sm text-text-muted">Ничего не найдено. Попробуйте изменить запрос.</p>
        </div>
      ) : null}

      {plans.length === 0 ? (
        <div className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center">
          <p className="text-sm text-text-secondary">
            Сохраненные планы появятся здесь после генерации общего плана по выбранной цели.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((plan, index) => {
          const progress = getPlanProgress(plan)
          const isActiveGoalPlan = Boolean(activeGoalId && plan.goalId === activeGoalId)

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                href={`/plan?code=${plan.nctCode}&title=${encodeURIComponent(plan.nctTitle)}`}
                className="group block rounded-[18px] border border-border bg-card-bg px-5 py-4 transition-colors hover:bg-background"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold tracking-wide text-primary">{plan.nctCode}</span>
                      {isActiveGoalPlan ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <Target className="h-3 w-3" />
                          Активная цель
                        </span>
                      ) : null}
                      {plan.roadmapId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <GitBranch className="h-3 w-3" />
                          Roadmap подключен
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1.5 text-sm font-semibold text-foreground">{plan.nctTitle}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {plan.level === "beginner" ? "Начальный" : plan.level === "intermediate" ? "Средний" : "Продвинутый"}
                      {" · "}
                      {new Date(plan.createdAt).toLocaleDateString("ru-RU")}
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>Прогресс по этапам</span>
                        <span>{progress.completed}/{progress.total || 0}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-background">
                        <div
                          className="h-2 rounded-full bg-primary transition-[width]"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-text-secondary">
                        {progress.total > 0
                          ? `${progress.percent}% этапов уже отмечены в этом плане`
                          : "Этапы появятся после генерации полного плана"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {progress.percent === 100 ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
                    <ExternalLink className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
