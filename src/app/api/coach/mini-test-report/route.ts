import { NextResponse } from "next/server"
import { z } from "zod"
import { generateCoachMiniTestReport } from "@/lib/ai/coach-mini-test-report"
import type { CoachMiniTest, CoachMiniTestResult } from "@/types/coach"

export const dynamic = "force-dynamic"

const RequestSchema = z.object({
  miniTest: z.unknown(),
  result: z.unknown(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message, data: null }, { status: 400 })
    }

    const reply = await generateCoachMiniTestReport(
      parsed.data.miniTest as CoachMiniTest,
      parsed.data.result as CoachMiniTestResult,
    )

    return NextResponse.json({ status: "success", data: { reply } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
