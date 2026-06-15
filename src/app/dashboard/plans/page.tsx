"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, ArrowUpDown, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"

type SortKey = "newest" | "oldest" | "level"

export default function DashboardPlans() {
  const plans = useProfileStore((s) => s.plans)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let result = plans

    if (q) {
      result = result.filter(
        (p) =>
          p.nctTitle.toLowerCase().includes(q) ||
          p.nctCode.toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => {
      if (sort === "newest") return b.createdAt - a.createdAt
      if (sort === "oldest") return a.createdAt - b.createdAt
      const order = { beginner: 0, intermediate: 1, advanced: 2 }
      return order[b.level] - order[a.level]
    })
  }, [plans, search, sort])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Планы развития</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {plans.length === 0 ? "У вас пока нет сохранённых планов" : `${plans.length} планов`}
        </p>
      </motion.div>

      {plans.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или коду..."
              className="h-10 w-full rounded-[12px] border border-border bg-card-bg pl-9 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setSort((s) => (s === "newest" ? "oldest" : s === "oldest" ? "level" : "newest"))}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-border bg-card-bg px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sort === "newest" ? "Новые" : sort === "oldest" ? "Старые" : "Уровень"}
          </button>
        </div>
      )}

      {filtered.length === 0 && plans.length > 0 && (
        <div className="mt-8 rounded-[18px] border border-border bg-background p-8 text-center">
          <p className="text-sm text-text-muted">Ничего не найдено. Попробуйте изменить запрос.</p>
        </div>
      )}

      {plans.length === 0 && (
        <div className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center">
          <p className="text-sm text-text-secondary">
            Сохранённые планы появятся здесь после анализа и генерации плана развития.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              href={`/plan?code=${plan.nctCode}&title=${encodeURIComponent(plan.nctTitle)}`}
              className="group block rounded-[18px] border border-border bg-card-bg px-5 py-4 transition-colors hover:bg-background"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold tracking-wide text-primary">{plan.nctCode}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {plan.level === "beginner" ? "Начальный" : plan.level === "intermediate" ? "Средний" : "Продвинутый"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{plan.nctTitle}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {plan.stages.length} этапов • {new Date(plan.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <ExternalLink className="ml-4 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
