import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      status: "error",
      error: "Fit Score заменён прозрачными сигналами внутри recommendation detail.",
      data: null,
    },
    { status: 410 },
  )
}
