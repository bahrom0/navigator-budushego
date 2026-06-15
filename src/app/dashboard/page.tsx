"use client"

import { motion } from "framer-motion"
import { ClipboardList, Mic, Bookmark, Activity } from "lucide-react"
import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"

export default function DashboardOverview() {
  const plans = useProfileStore((s) => s.plans)
  const interviews = useProfileStore((s) => s.interviews)
  const bookmarks = useProfileStore((s) => s.bookmarks)
  const activityLog = useProfileStore((s) => s.activityLog)

  const stats = [
    { label: "Планы", value: plans.length, icon: ClipboardList, href: "/dashboard/plans", color: "text-primary" },
    { label: "Интервью", value: interviews.length, icon: Mic, href: "/dashboard/interviews", color: "text-success" },
    { label: "Закладки", value: bookmarks.length, icon: Bookmark, href: "/dashboard/bookmarks", color: "text-warning" },
    { label: "Действия", value: activityLog.length, icon: Activity, href: "/dashboard/activity", color: "text-primary" },
  ]

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Обзор</h1>
        <p className="mt-1 text-sm text-text-secondary">Ваша активность и сохранённые данные</p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={stat.href}
              className="block rounded-[18px] border border-border bg-card-bg p-5 transition-colors hover:bg-background"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-sm text-text-secondary">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Последние планы</h2>
        {plans.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-border bg-background p-8 text-center">
            <p className="text-sm text-text-muted">У вас пока нет сохранённых планов</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {plans.slice(0, 5).map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/plan?code=${plan.nctCode}&title=${encodeURIComponent(plan.nctTitle)}`}
                  className="block rounded-[16px] border border-border bg-card-bg px-5 py-4 transition-colors hover:bg-background"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{plan.nctTitle}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{plan.nctCode}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {plan.level}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
