import { NextResponse } from "next/server"
import { z } from "zod"
import { generateRoadmap } from "@/lib/ai/coach-roadmap"
import type { CoachDiagnosticResult, RoadmapDurationWeeks } from "@/types/coach"
import type { DevelopmentPlan } from "@/types/plan"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const RoadmapRequestSchema = z.object({
  goalId: z.string().min(1, "Укажите ID цели"),
  planId: z.string().min(1).optional(),
  nctCode: z.string().trim().min(1, "Укажите код НЦТ").max(20),
  nctTitle: z.string().trim().min(1, "Укажите название специальности").max(200),
  university: z.string().trim().max(200).optional().or(z.literal("")),
  profession: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(200).optional().or(z.literal("")),
  durationWeeks: z.number().int().refine((v) => [1, 2, 4, 12].includes(v), {
    message: "Длительность должна быть 1, 2, 4 или 12 недель",
  }).optional().default(12),
  generalPlan: z.any().optional(),
  diagnosticResult: z.any().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RoadmapRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          error: parsed.error.issues[0]?.message ?? "Некорректные данные",
          data: null,
        },
        { status: 400 },
      )
    }

    const { goalId, planId, nctCode, nctTitle, university, profession, city, durationWeeks, generalPlan, diagnosticResult } =
      parsed.data

    const roadmap = await generateRoadmap({
      goalId,
      planId,
      nctCode,
      nctTitle,
      university: university || undefined,
      profession: profession || undefined,
      city: city || undefined,
      durationWeeks: durationWeeks as RoadmapDurationWeeks,
      generalPlan: generalPlan as DevelopmentPlan | null | undefined,
      diagnosticResult: diagnosticResult as CoachDiagnosticResult | null | undefined,
    })

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    let persistedRoadmapId: string | null = null

    if (session && user) {
      const { data: goal } = await supabase
        .from("admission_goals")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", goalId)
        .maybeSingle()

      if (goal) {
        const { data: existingRoadmap } = await supabase
          .from("roadmaps")
          .select("id")
          .eq("user_id", user.id)
          .eq("goal_id", goalId)
          .eq("status", "active")
          .maybeSingle()

        const basePayload: Record<string, unknown> = {
          user_id: user.id,
          session_id: null,
          goal_id: goalId,
          plan_id: planId ?? null,
          weeks: roadmap.weeks,
          current_week_number: 1,
          status: "active",
          updated_at: new Date().toISOString(),
        }

        const maybeExtraPayload: Record<string, unknown> = {}
        if (durationWeeks !== undefined) maybeExtraPayload.duration_weeks = durationWeeks
        if (roadmap.title ?? nctTitle) maybeExtraPayload.title = roadmap.title ?? nctTitle
        if (nctCode) maybeExtraPayload.nct_code = nctCode
        if (nctTitle) maybeExtraPayload.nct_title = nctTitle
        if (generalPlan) maybeExtraPayload.plan_snapshot = generalPlan as Record<string, unknown>
        if (diagnosticResult) maybeExtraPayload.diagnostic_snapshot = diagnosticResult as Record<string, unknown>
        maybeExtraPayload.generation_context = {
          goalId,
          planId: planId ?? null,
          nctCode,
          nctTitle,
          university: university || undefined,
          profession: profession || undefined,
          city: city || undefined,
          durationWeeks,
          hasGeneralPlan: !!generalPlan,
          hasDiagnostic: !!diagnosticResult,
        }

        if (existingRoadmap?.id) {
          persistedRoadmapId = existingRoadmap.id
          const updatePayload = { ...basePayload, ...maybeExtraPayload }
          try {
            await supabase.from("roadmaps").update(updatePayload).eq("id", existingRoadmap.id)
          } catch {
            await supabase.from("roadmaps").update(basePayload).eq("id", existingRoadmap.id)
          }
          if (planId) {
            await supabase
              .from("plans")
              .update({ roadmap_id: existingRoadmap.id, updated_at: new Date().toISOString() })
              .eq("id", planId)
          }
        } else {
          const insertPayload = { ...basePayload, created_at: new Date().toISOString() }
          const { data: insertedRoadmap, error: roadmapError } = await supabase
            .from("roadmaps")
            .insert(insertPayload)
            .select("id")
            .single()

          if (roadmapError) {
            return NextResponse.json({ status: "error", error: roadmapError.message, data: null }, { status: 500 })
          }

          persistedRoadmapId = insertedRoadmap.id

          if (Object.keys(maybeExtraPayload).length > 0) {
            try {
              await supabase
                .from("roadmaps")
                .update(maybeExtraPayload)
                .eq("id", insertedRoadmap.id)
            } catch {} // columns may not exist before migration 015
          }

          if (planId) {
            await supabase.from("plans").update({ roadmap_id: insertedRoadmap.id, updated_at: new Date().toISOString() }).eq("id", planId)
          }
        }
      }
    }

    return NextResponse.json({
      status: "success",
      data: { roadmap: { ...roadmap, id: persistedRoadmapId ?? roadmap.id } },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/roadmap] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
