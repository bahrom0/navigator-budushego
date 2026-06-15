import { NextResponse } from "next/server"
import { z } from "zod"
import { generateStrategy } from "@/features/strategy/strategy-engine"
import { generateStrategyAI } from "@/lib/ai/generate-strategy"
import { nctCodes } from "@/lib/ai/nct-match"

export const dynamic = "force-dynamic"

const StrategyRequestSchema = z.object({
  categories: z.array(z.string()).min(1),
  level: z.string().optional(),
  interviewSummary: z.string().optional(),
  useAI: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = StrategyRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { categories, level, interviewSummary, useAI } = parsed.data

    const clusterCounts = new Map<number, { name: string; count: number }>()
    for (const code of nctCodes) {
      const existing = clusterCounts.get(code.cluster)
      if (existing) {
        existing.count++
      } else {
        clusterCounts.set(code.cluster, { name: code.cluster_name_ru, count: 1 })
      }
    }

    const availableClusters = Array.from(clusterCounts.entries()).map(
      ([id, info]) => ({ id, name: info.name, codeCount: info.count }),
    )

    let result

    if (useAI) {
      const aiResult = await generateStrategyAI({
        categories,
        level,
        interviewSummary,
        availableClusters,
      })

      if (aiResult && aiResult.strategies.length === 3) {
        result = aiResult
      } else {
        result = generateStrategy({ categories, level, interviewResult: interviewSummary ? { summary: interviewSummary } : undefined })
      }
    } else {
      result = generateStrategy({ categories, level, interviewResult: interviewSummary ? { summary: interviewSummary } : undefined })
    }

    return NextResponse.json({ status: "success", data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
