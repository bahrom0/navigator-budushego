import type { SupabaseClient } from "@supabase/supabase-js"

type AppendProductHistoryInput = {
  goalId?: string | null
  entityType: string
  entityId?: string | null
  action: string
  title: string
  summary?: string | null
  metadata?: Record<string, unknown>
  occurredAt?: string
  clientEventId?: string
}

function buildClientEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function appendProductHistory(
  supabase: SupabaseClient,
  userId: string,
  input: AppendProductHistoryInput,
): Promise<void> {
  const payload = {
    user_id: userId,
    goal_id: input.goalId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    title: input.title,
    summary: input.summary ?? null,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    client_event_id: input.clientEventId ?? buildClientEventId(input.action),
  }

  const { error } = await supabase.from("product_history").insert(payload)
  if (error) {
    throw error
  }
}
