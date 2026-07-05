import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      status: "error",
      error: "Объяснение теперь является частью результата рекомендаций.",
      data: null,
    },
    { status: 410 },
  )
}
