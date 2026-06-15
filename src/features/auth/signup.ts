import { createClient } from "@/lib/supabase/client"

export async function signupWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error: error?.message ?? null }
}
