import { NextResponse } from "next/server"
import { buildRecommendations } from "@/lib/recommendations/service"
import {
  RecommendationsRequestSchema,
  type RecommendationsRequest,
} from "@/types/api/recommendations"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RecommendationsRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const input: RecommendationsRequest = parsed.data
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
