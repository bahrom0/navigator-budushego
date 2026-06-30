import { NextResponse } from "next/server"
import { z } from "zod"
import { generateRoadmap } from "@/lib/ai/coach-roadmap"
import type { CoachDiagnosticResult } from "@/types/coach"

export const dynamic = "force-dynamic"

const RoadmapRequestSchema = z.object({
  goalId: z.string().min(1, "Укажите ID цели"),
  nctCode: z.string().trim().min(1, "Укажите код НЦТ").max(20),
  nctTitle: z.string().trim().min(1, "Укажите название специальности").max(200),
  university: z.string().trim().max(200).optional().or(z.literal("")),
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

    const { goalId, nctCode, nctTitle, university, diagnosticResult } =
      parsed.data

    const roadmap = await generateRoadmap({
      goalId,
      nctCode,
      nctTitle,
      university: university || undefined,
      diagnosticResult: diagnosticResult as CoachDiagnosticResult | null | undefined,
    })

    return NextResponse.json({
      status: "success",
      data: { roadmap },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/roadmap] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
