"use client"

import { Map, Target, MessageCircle, TrendingUp } from "lucide-react"
import { CoachRoadmap } from "@/components/coach/CoachRoadmap"
import { CoachDailyPlan } from "@/components/coach/CoachDailyPlan"
import type { CoachActiveTab } from "@/types/coach"

const TAB_LABELS: Record<CoachActiveTab, string> = {
  roadmap: "Roadmap",
  today: "Today",
  chat: "Chat",
  progress: "Progress",
}

const TAB_ICONS: Record<CoachActiveTab, typeof Map> = {
  roadmap: Map,
  today: Target,
  chat: MessageCircle,
  progress: TrendingUp,
}

export interface CoachTabContentProps {
  tab: CoachActiveTab
  onGenerateRoadmap?: () => void
  onGenerateDailyPlan?: () => void
  onRequestTaskDetail?: (taskId: string) => void
}

export function CoachTabContent({ tab, onGenerateRoadmap, onGenerateDailyPlan, onRequestTaskDetail }: CoachTabContentProps) {
  if (tab === "roadmap") {
    return <CoachRoadmap onGenerate={onGenerateRoadmap} />
  }

  if (tab === "today") {
    return <CoachDailyPlan onGenerate={onGenerateDailyPlan} onRequestTaskDetail={onRequestTaskDetail} />
  }

  const Icon = TAB_ICONS[tab]
  return (
    <section className="rounded-[20px] border border-border bg-card-bg p-6">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          Раздел «{TAB_LABELS[tab]}»
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Содержимое раздела появится после запуска соответствующего этапа
          подготовки.
        </p>
      </div>
    </section>
  )
}
