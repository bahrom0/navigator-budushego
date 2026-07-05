import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      status: "error",
      error: "Отдельная стратегия скрыта: следующий шаг после рекомендации — выбор цели и общий план.",
      data: null,
    },
    { status: 410 },
  )
}
