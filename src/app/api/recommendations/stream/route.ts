import { NextResponse } from "next/server";
import { buildRecommendations } from "@/lib/recommendations/service";
import {
  RecommendationsRequestSchema,
  type RecommendationsRequest,
} from "@/types/api/recommendations";
import type { AnalysisStep } from "@/types/analysis";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RecommendationsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      );
    }

    const input: RecommendationsRequest = parsed.data;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const push = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          const result = await buildRecommendations(input, {
            onProgress(step: AnalysisStep) {
              push({ type: "stage", step });
            },
          });

          push({ type: "result", data: result });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Internal server error";
          push({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    );
  }
}
