import { NextResponse } from "next/server"
import { buildRecommendations } from "@/lib/recommendations/service"
import {
  AnalyzeRequestSchema,
  type AnalyzeRequest,
} from "@/types/api/analyze"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = AnalyzeRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          error: parsed.error.message,
          data: null,
        },
        { status: 400 },
      )
    }

    const input: AnalyzeRequest = parsed.data
    const result = await buildRecommendations(input)

    return NextResponse.json({
      status: "success",
      data: result,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
