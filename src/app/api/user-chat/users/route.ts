import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireUsername, UsernameGateError } from "@/lib/user-chat/guard"

export const dynamic = "force-dynamic"

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
})

export async function GET(request: Request) {
  try {
    const userId = await requireUsername()

    const supabase = await createClient()
    const url = new URL(request.url)
    const q = url.searchParams.get("q")

    const parsed = SearchSchema.safeParse({ q })
    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: "Query required" }, { status: 400 })
    }

    const { data: users } = await supabase
      .from("profiles")
      .select("id, user_id, username, email, name, avatar_url")
      .or(`username.ilike.%${parsed.data.q}%,name.ilike.%${parsed.data.q}%`)
      .not("user_id", "eq", userId)
      .not("username", "is", null)
      .limit(20)

    return NextResponse.json({ status: "success", data: users ?? [] })
  } catch (error) {
    if (error instanceof UsernameGateError) {
      return NextResponse.json({ status: "error", error: "Username required" }, { status: 428 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}
