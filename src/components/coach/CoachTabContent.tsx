"use client"

import { Map, Target, MessageCircle, TrendingUp } from "lucide-react"
import { CoachRoadmap } from "@/components/coach/CoachRoadmap"
import { CoachDailyPlan } from "@/components/coach/CoachDailyPlan"
import { CoachProgress } from "@/components/coach/CoachProgress"
import { CoachChat } from "./CoachChat"
import type { CoachActiveTab, RoadmapDurationWeeks } from "@/types/coach"

export interface CoachTabContentProps {
  tab: CoachActiveTab
  onGenerateRoadmap?: (durationWeeks?: RoadmapDurationWeeks) => void
  onGenerateDailyPlan?: (targetDate?: string) => void
  onRequestTaskDetail?: (taskId: string) => void
  onNavigateDate?: (date: string) => void
}

export function CoachTabContent({ tab, onGenerateRoadmap, onGenerateDailyPlan, onRequestTaskDetail, onNavigateDate }: CoachTabContentProps) {
  if (tab === "roadmap") {
    return <CoachRoadmap onGenerate={onGenerateRoadmap} />
  }

  if (tab === "today") {
    return <CoachDailyPlan onGenerate={onGenerateDailyPlan} onRequestTaskDetail={onRequestTaskDetail} onNavigateDate={onNavigateDate} />
  }

  if (tab === "chat") {
    return <CoachChat />
  }

  if (tab === "progress") {
    return <CoachProgress />
  }

  return null
}
