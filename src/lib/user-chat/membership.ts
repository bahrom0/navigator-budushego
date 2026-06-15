import { createClient } from "@/lib/supabase/server"

export async function isMember(conversationId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("conversation_members")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)

  return (count ?? 0) > 0
}

export async function requireMember(conversationId: string, userId: string): Promise<void> {
  const ok = await isMember(conversationId, userId)
  if (!ok) {
    throw new Error("Not a member of this conversation")
  }
}

export async function getMemberIds(conversationId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)

  return (data ?? []).map((m) => m.user_id)
}
