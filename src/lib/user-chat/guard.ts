import { createClient } from "@/lib/supabase/server"

export class UsernameGateError extends Error {
  constructor() {
    super("Username required")
    this.name = "UsernameGateError"
  }
}

export async function requireUsername(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new UsernameGateError()
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .single()

  if (!profile?.username) {
    throw new UsernameGateError()
  }

  return user.id
}

export async function checkUsername(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", userId)
    .single()

  return !!profile?.username
}
