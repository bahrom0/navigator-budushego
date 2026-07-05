import type { SupabaseClient } from "@supabase/supabase-js"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

function normalizeCode(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const normalized = value.replace(/\s+/g, "").trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

type CoachContextInput = {
  goalId?: string | null
  planId?: string | null
  nctCode?: string | null
  nctTitle?: string | null
  university?: string | null
  profession?: string | null
  city?: string | null
}

type GoalRow = {
  id: string
  nct_code?: string | null
  nct_title?: string | null
  university?: string | null
  profession?: string | null
  city?: string | null
}

type PlanRow = {
  id: string
}

export async function resolveCoachContext(
  supabase: SupabaseClient,
  userId: string,
  input: CoachContextInput,
): Promise<{ goal: GoalRow | null; plan: PlanRow | null }> {
  const normalizedCode = normalizeCode(input.nctCode)
  let goal: GoalRow | null = null
  let plan: PlanRow | null = null

  if (isUuid(input.goalId)) {
    const { data, error } = await supabase
      .from("admission_goals")
      .select("id, nct_code, nct_title, university, profession, city")
      .eq("user_id", userId)
      .eq("id", input.goalId)
      .eq("status", "active")
      .maybeSingle()
    if (error) throw error
    goal = (data as GoalRow | null) ?? null
  }

  if (!goal && normalizedCode) {
    const { data, error } = await supabase
      .from("admission_goals")
      .select("id, nct_code, nct_title, university, profession, city")
      .eq("user_id", userId)
      .eq("nct_code", normalizedCode)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    goal = (data as GoalRow | null) ?? null
  }

  if (!goal && normalizedCode && input.nctTitle) {
    const { error: archiveError } = await supabase
      .from("admission_goals")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "active")
    if (archiveError) throw archiveError

    const { data, error } = await supabase
      .from("admission_goals")
      .insert({
        user_id: userId,
        nct_code: normalizedCode,
        nct_title: input.nctTitle,
        university: input.university ?? null,
        profession: input.profession ?? null,
        city: input.city ?? null,
        status: "active",
      })
      .select("id, nct_code, nct_title, university, profession, city")
      .single()
    if (error) throw error

    goal = (data as GoalRow | null) ?? null
  }

  if (goal) {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          active_goal_id: goal.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
    if (error) throw error
  }

  if (isUuid(input.planId)) {
    const { data, error } = await supabase
      .from("plans")
      .select("id")
      .eq("user_id", userId)
      .eq("id", input.planId)
      .maybeSingle()
    if (error) throw error
    plan = (data as PlanRow | null) ?? null
  }

  if (!plan && goal?.id) {
    const { data, error } = await supabase
      .from("plans")
      .select("id")
      .eq("user_id", userId)
      .eq("goal_id", goal.id)
      .eq("plan_type", "general")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    plan = (data as PlanRow | null) ?? null
  }

  return { goal, plan }
}
