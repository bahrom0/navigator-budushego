import { NextResponse } from "next/server"
import { z } from "zod"
import { generateTaskDetail } from "@/lib/ai/coach-task-detail"

export const dynamic = "force-dynamic"

const TaskDetailRequestSchema = z.object({
  taskTitle: z.string().min(1, "Укажите название задачи").max(300),
  taskType: z.enum(["study", "practice", "review", "test"]),
  taskDescription: z.string().min(1, "Укажите описание").max(500),
  nctTitle: z.string().min(1, "Укажите специальность").max(200),
  weekTitle: z.string().min(1, "Укажите неделю").max(200),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = TaskDetailRequestSchema.safeParse(body)

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

    const steps = await generateTaskDetail(parsed.data)

    return NextResponse.json({
      status: "success",
      data: { steps },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    console.error("[coach/task-detail] error:", message)
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
