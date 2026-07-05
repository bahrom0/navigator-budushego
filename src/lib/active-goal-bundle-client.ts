import type { ActiveGoalBundle } from "@/types/admission"

export async function fetchActiveGoalBundle(): Promise<ActiveGoalBundle | null> {
  const res = await fetch("/api/plan/full", { cache: "no-store" })
  const payload = (await res.json()) as {
    status?: string
    data?: { bundle?: ActiveGoalBundle | null }
  }

  if (!res.ok || payload.status !== "success") {
    throw new Error("Failed to load active goal bundle")
  }

  return payload.data?.bundle ?? null
}
