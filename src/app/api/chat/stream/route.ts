import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sseManager } from "@/lib/chat/sse-manager"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  let connectionId: string | null = null

  const stream = new ReadableStream({
    start(controller) {
      connectionId = sseManager.register(user.id, controller)
      request.signal.addEventListener("abort", () => {
        if (connectionId) sseManager.unregister(connectionId)
      })
    },
    cancel() {
      if (connectionId) sseManager.unregister(connectionId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
