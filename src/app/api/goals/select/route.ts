import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getByCode } from "@/lib/db/nct-db"

export const dynamic = "force-dynamic"

const RecommendationSnapshotSchema = z.object({
  version: z.literal(1),
  selectedAt: z.string(),
  inputs: z.object({
    categories: z.array(z.object({ id: z.string(), name: z.string() })),
    keywords: z.array(z.string()),
    onboarding: z.object({
      userCity: z.string().optional(),
      studyCity: z.string().optional(),
      userType: z.string().optional(),
      educationLevel: z.enum(["after_9", "after_11", "applicant", ""]).optional(),
      interests: z.array(z.string()).optional(),
    }).nullable(),
  }),
  selection: z.object({
    code: z.string(),
    title: z.string(),
    rank: z.number().int().positive(),
    confidence: z.number().min(0).max(1),
    finalScore: z.number(),
    explanation: z.string(),
    matchedInterests: z.array(z.string()),
    matchedCareers: z.array(z.string()),
    relatedCodes: z.array(z.string()),
  }),
  filters: z.object({
    city: z.string().optional(),
    studyForm: z.string().optional(),
    sortBy: z.enum(["confidence", "institution"]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  }),
  overallConfidence: z.number().min(0).max(1),
})

const SelectGoalSchema = z.object({
  sessionId: z.string().optional(),
  nctCode: z.string().trim().min(1).max(20),
  nctTitle: z.string().trim().min(1).max(200),
  university: z.string().trim().max(200).optional().or(z.literal("")),
  profession: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(200).optional().or(z.literal("")),
  matchedInterests: z.array(z.string()).optional(),
  careerMatches: z.array(z.string()).optional(),
  recommendationSnapshot: RecommendationSnapshotSchema.optional(),
})

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = SelectGoalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid goal data", data: null },
        { status: 400 },
      )
    }

    const raw = parsed.data
    const nctCode = raw.nctCode.replace(/\s+/g, "").toUpperCase()

    let resolvedTitle = raw.nctTitle
    let resolvedUniversity = raw.university?.trim() || undefined
    let resolvedProfession = raw.profession?.trim() || raw.careerMatches?.[0] || undefined
    let resolvedCity = raw.city?.trim() || undefined

    try {
      const records = getByCode(nctCode)
      const record = records[0]
      if (record) {
        resolvedTitle = record.specialty_name || resolvedTitle
        resolvedUniversity = resolvedUniversity || record.university_name || undefined
        resolvedCity = resolvedCity || record.location || undefined
        resolvedProfession = resolvedProfession || record.specialty_name || undefined
      }
    } catch {
      // Fallback to the passed data when the local database lookup is unavailable.
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()
    const sessionId = raw.sessionId?.trim() || null

    const goal = {
      id: generateId(),
      nctCode,
      nctTitle: resolvedTitle,
      university: resolvedUniversity,
      profession: resolvedProfession,
      city: resolvedCity,
      setAt: Date.now(),
      status: "active" as const,
    }

    if (session && user) {
      await supabase
        .from("admission_goals")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("status", "active")

      const { data: inserted, error: insertError } = await supabase
        .from("admission_goals")
        .insert({
          user_id: user.id,
          session_id: sessionId,
          nct_code: goal.nctCode,
          nct_title: goal.nctTitle,
          university: goal.university,
          profession: goal.profession,
          city: goal.city,
          status: "active",
          goal_context: raw.recommendationSnapshot
            ? { recommendationSnapshot: raw.recommendationSnapshot }
            : {},
        })
        .select("*")
        .single()

      if (insertError) {
        return NextResponse.json({ status: "error", error: insertError.message, data: null }, { status: 500 })
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          session_id: sessionId,
          active_goal_id: inserted.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })

      if (profileError) {
        return NextResponse.json({ status: "error", error: profileError.message, data: null }, { status: 500 })
      }

      return NextResponse.json({
        status: "success",
        data: {
          goal: {
            ...goal,
            id: inserted.id,
          },
          recommendationSnapshot: raw.recommendationSnapshot,
          persisted: true,
        },
      })
    }

    return NextResponse.json({
      status: "success",
      data: {
        goal,
        persisted: false,
        recommendationSnapshot: raw.recommendationSnapshot,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
