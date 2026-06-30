"use client"

import { Map, Target, MessageCircle, TrendingUp } from "lucide-react"
import { CoachRoadmap } from "@/components/coach/CoachRoadmap"
import { CoachDailyPlan } from "@/components/coach/CoachDailyPlan"
import { CoachProgress } from "@/components/coach/CoachProgress"
import { CoachChat } from "./CoachChat"
import type { CoachActiveTab } from "@/types/coach"

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

  if (tab === "chat") {
    return <CoachChat />
  }

  if (tab === "progress") {
    return <CoachProgress />
  }

  return null
}
