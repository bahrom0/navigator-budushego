"use client"

import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"
import { ClipboardList, ArrowRight } from "lucide-react"

export function ProfilePlansList() {
  const plans = useProfileStore((s) => s.plans)

  if (plans.length === 0) {
    return (
      <div className="rounded-[16px] border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClipboardList className="h-4 w-4 text-success" />
          Планы
        </div>
        <p className="text-sm text-text-muted">Генерация плана появится после анализа и интервью.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClipboardList className="h-4 w-4 text-success" />
          Планы
        </div>
        <Link
          href="/dashboard/plans"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Все планы
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {plans.slice(0, 5).map((plan) => (
          <div key={plan.id} className="rounded-[12px] bg-card-bg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{plan.nctTitle}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {plan.level}
              </span>
            </div>
            <span className="text-xs text-text-muted">{plan.stages.length} этапов</span>
          </div>
        ))}
      </div>
      {plans.length > 5 && (
        <p className="mt-2 text-xs text-text-muted">+ ещё {plans.length - 5} планов</p>
      )}
    </div>
  )
}
