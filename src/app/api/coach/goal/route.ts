import { NextResponse } from "next/server"
import { z } from "zod"
import { getByCode } from "@/lib/db/nct-db"

export const dynamic = "force-dynamic"

const GoalRequestSchema = z.object({
  nctCode: z
    .string()
    .trim()
    .min(1, "Укажите код НЦТ")
    .max(20, "Слишком длинный код НЦТ"),
  nctTitle: z
    .string()
    .trim()
    .min(1, "Укажите название специальности")
    .max(200, "Слишком длинное название"),
  university: z
    .string()
    .trim()
    .max(200, "Слишком длинное название университета")
    .optional()
    .or(z.literal("")),
})

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = GoalRequestSchema.safeParse(body)

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

    const raw = parsed.data
    const nctCode = normalizeCode(raw.nctCode)
    const nctTitle = raw.nctTitle.trim()
    const universityInput = raw.university?.trim() ?? ""

    let resolvedTitle = nctTitle
    let resolvedUniversity: string | undefined = universityInput || undefined

    try {
      const records = getByCode(nctCode)
      if (records.length > 0) {
        const record = records[0]
        resolvedTitle = nctTitle || record.specialty_name
        if (!resolvedUniversity && record.university_name) {
          resolvedUniversity = record.university_name
        }
      }
    } catch {
      // база НЦТ недоступна — продолжаем с тем, что прислал пользователь
    }

    const goal = {
      id: generateId(),
      nctCode,
      nctTitle: resolvedTitle,
      university: resolvedUniversity,
      setAt: Date.now(),
      status: "active" as const,
    }

    return NextResponse.json({ status: "success", data: { goal } })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}
