import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"
import type { CommunityScope, UserCommunityContext } from "@/lib/user-chat/types"

export const dynamic = "force-dynamic"

const SearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  scope: z.enum(["goal", "university", "city", "week"]).optional(),
  nctCode: z.string().trim().max(40).optional(),
  university: z.string().trim().max(160).optional(),
  city: z.string().trim().max(120).optional(),
  week: z.coerce.number().int().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
})

type ProfileRow = {
  id: string
  user_id: string
  username: string | null
  email: string | null
  name: string | null
  level: string | null
  avatar_url: string | null
  active_goal_id: string | null
  updated_at?: string | null
}

type GoalRow = {
  id: string
  nct_code: string | null
  nct_title: string | null
  university: string | null
  city: string | null
}

type RoadmapRow = {
  goal_id: string
  current_week_number: number | null
  updated_at?: string | null
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function isTruthyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function buildCommunityContext(
  profile: ProfileRow,
  goalsById: Map<string, GoalRow>,
  weeksByGoalId: Map<string, number | null>,
): UserCommunityContext | null {
  const goalId = profile.active_goal_id
  if (!goalId) return null

  const goal = goalsById.get(goalId)
  if (!goal) return null

  return {
    goal_id: goalId,
    nct_code: goal.nct_code ?? null,
    nct_title: goal.nct_title ?? null,
    university: goal.university ?? null,
    city: goal.city ?? null,
    current_week_number: weeksByGoalId.get(goalId) ?? null,
  }
}

function matchesScope(
  scope: CommunityScope | undefined,
  context: UserCommunityContext | null,
  filters: z.infer<typeof SearchSchema>,
): boolean {
  if (!scope) return true
  if (!context) return false

  switch (scope) {
    case "goal":
      return isTruthyString(filters.nctCode) && context.nct_code === filters.nctCode
    case "university":
      return (
        isTruthyString(filters.university)
        && normalizeText(context.university) === normalizeText(filters.university)
      )
    case "city":
      return isTruthyString(filters.city) && normalizeText(context.city) === normalizeText(filters.city)
    case "week":
      return (
        isTruthyString(filters.nctCode)
        && context.nct_code === filters.nctCode
        && typeof filters.week === "number"
        && context.current_week_number === filters.week
      )
    default:
      return true
  }
}

function buildMatchReasons(
  context: UserCommunityContext | null,
  filters: z.infer<typeof SearchSchema>,
): string[] {
  if (!context) return []

  const reasons: string[] = []

  if (isTruthyString(filters.nctCode) && context.nct_code === filters.nctCode) {
    reasons.push(`Тот же код: ${filters.nctCode}`)
  }

  if (
    isTruthyString(filters.university)
    && normalizeText(context.university) === normalizeText(filters.university)
  ) {
    reasons.push("Тот же вуз")
  }

  if (isTruthyString(filters.city) && normalizeText(context.city) === normalizeText(filters.city)) {
    reasons.push("Тот же город")
  }

  if (
    typeof filters.week === "number"
    && context.current_week_number === filters.week
    && isTruthyString(filters.nctCode)
    && context.nct_code === filters.nctCode
  ) {
    reasons.push(`Неделя ${filters.week} roadmap`)
  }

  return reasons
}

function compareProfiles(
  left: {
    profile: ProfileRow
    reasons: string[]
    context: UserCommunityContext | null
  },
  right: {
    profile: ProfileRow
    reasons: string[]
    context: UserCommunityContext | null
  },
): number {
  if (right.reasons.length !== left.reasons.length) {
    return right.reasons.length - left.reasons.length
  }

  const leftWeek = left.context?.current_week_number ?? -1
  const rightWeek = right.context?.current_week_number ?? -1
  if (rightWeek !== leftWeek) {
    return rightWeek - leftWeek
  }

  const leftUpdated = left.profile.updated_at ? Date.parse(left.profile.updated_at) : 0
  const rightUpdated = right.profile.updated_at ? Date.parse(right.profile.updated_at) : 0
  if (rightUpdated !== leftUpdated) {
    return rightUpdated - leftUpdated
  }

  return (left.profile.name ?? left.profile.username ?? "").localeCompare(
    right.profile.name ?? right.profile.username ?? "",
    "ru",
  )
}

export async function GET(request: Request) {
  try {
    const userId = await requireUsername()
    const admin = await createAdminClient()
    const url = new URL(request.url)

    const parsed = SearchSchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      scope: url.searchParams.get("scope") ?? undefined,
      nctCode: url.searchParams.get("nctCode") ?? undefined,
      university: url.searchParams.get("university") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      week: url.searchParams.get("week") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: "Invalid community query" }, { status: 400 })
    }

    const filters = parsed.data
    const query = filters.q?.trim() ?? ""
    const limit = filters.limit ?? 12

    if (!query && !filters.scope) {
      return NextResponse.json({ status: "success", data: [] })
    }

    let profileQuery = admin
      .from("profiles")
      .select("id, user_id, username, email, name, level, avatar_url, active_goal_id, updated_at")
      .not("user_id", "eq", userId)
      .not("username", "is", null)
      .limit(query ? Math.max(limit, 20) : 60)

    if (query) {
      profileQuery = profileQuery.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
    }

    const { data: profiles, error: profileError } = await profileQuery
    if (profileError) {
      return NextResponse.json({ status: "error", error: profileError.message }, { status: 500 })
    }

    const candidates = (profiles ?? []) as ProfileRow[]
    if (candidates.length === 0) {
      return NextResponse.json({ status: "success", data: [] })
    }

    const goalIds = Array.from(
      new Set(
        candidates
          .map((profile) => profile.active_goal_id)
          .filter((value): value is string => isTruthyString(value)),
      ),
    )

    const goalsById = new Map<string, GoalRow>()
    const weeksByGoalId = new Map<string, number | null>()

    if (goalIds.length > 0) {
      const [{ data: goals, error: goalsError }, { data: roadmaps, error: roadmapsError }] = await Promise.all([
        admin
          .from("admission_goals")
          .select("id, nct_code, nct_title, university, city")
          .in("id", goalIds),
        admin
          .from("roadmaps")
          .select("goal_id, current_week_number, updated_at")
          .in("goal_id", goalIds)
          .eq("status", "active")
          .order("updated_at", { ascending: false }),
      ])

      if (goalsError) {
        return NextResponse.json({ status: "error", error: goalsError.message }, { status: 500 })
      }
      if (roadmapsError) {
        return NextResponse.json({ status: "error", error: roadmapsError.message }, { status: 500 })
      }

      for (const goal of (goals ?? []) as GoalRow[]) {
        goalsById.set(goal.id, goal)
      }

      for (const roadmap of (roadmaps ?? []) as RoadmapRow[]) {
        if (!weeksByGoalId.has(roadmap.goal_id)) {
          weeksByGoalId.set(roadmap.goal_id, roadmap.current_week_number ?? null)
        }
      }
    }

    const results = candidates
      .map((profile) => {
        const context = buildCommunityContext(profile, goalsById, weeksByGoalId)
        const reasons = buildMatchReasons(context, filters)
        return {
          profile,
          context,
          reasons,
        }
      })
      .filter((candidate) => matchesScope(filters.scope, candidate.context, filters))
      .sort(compareProfiles)
      .slice(0, limit)
      .map(({ profile, context, reasons }) => ({
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username,
        email: profile.email,
        name: profile.name,
        level: profile.level ?? "beginner",
        avatar_url: profile.avatar_url,
        active_goal_id: profile.active_goal_id,
        community_context: context,
        match_reasons: reasons,
      }))

    return NextResponse.json({ status: "success", data: results })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
