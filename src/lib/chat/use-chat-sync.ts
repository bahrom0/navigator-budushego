"use client"

import { useEffect, useRef } from "react"
import { useTeacherStore } from "@/stores/teacher-store"
import {
  loadMessages,
  saveMessage,
  saveMessages,
  getCursor,
  setCursor,
} from "@/lib/chat/db"
import type { ChatMessageRecord } from "@/types/chat"

function toTeacherMessage(m: ChatMessageRecord) {
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    timestamp: new Date(m.created_at).getTime(),
    type: m.type as "text" | "reminder" | "quiz" | "progress" | undefined,
    status: "sent" as const,
  }
}

async function hydrateFromIndexedDB(sessionId: string) {
  const cached = await loadMessages(sessionId)
  if (cached.length === 0) return
  const msgs = cached.map(toTeacherMessage)
  useTeacherStore.getState().setMessages(msgs)
}

async function deltaSync(sessionId: string) {
  try {
    const cursor = await getCursor(sessionId)
    const url = cursor
      ? `/api/chat/sessions/${sessionId}/messages?after=${encodeURIComponent(cursor)}`
      : `/api/chat/sessions/${sessionId}/messages`

    const res = await fetch(url)
    const json = await res.json()
    if (json.status !== "success" || !Array.isArray(json.data)) return
    if (json.data.length === 0) return

    const records = json.data as ChatMessageRecord[]
    const teacherMessages = records.map(toTeacherMessage)

    useTeacherStore.getState().addMessages(teacherMessages)
    await saveMessages(records)

    const last = records[records.length - 1]
    if (last) {
      await setCursor(sessionId, `${last.created_at}|${last.id}`)
    }
  } catch {
    // silent
  }
}

export function useChatSync() {
  const activeSessionId = useTeacherStore((s) => s.activeSessionId)

  useEffect(() => {
    if (!activeSessionId) return
    const sessionId: string = activeSessionId
    let cancelled = false

    async function init() {
      await hydrateFromIndexedDB(sessionId)
      if (cancelled) return
      await deltaSync(sessionId)
    }

    init()
    return () => { cancelled = true }
  }, [activeSessionId])

  useEffect(() => {
    if (!activeSessionId) return

    const reconnectTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const es = new EventSource("/api/chat/stream")

    es.addEventListener("message.created", async (event) => {
      try {
        const data = JSON.parse(event.data) as ChatMessageRecord
        const store = useTeacherStore.getState()
        if (data.session_id !== store.activeSessionId) return

        const exists = store.messages.some((m) => m.id === data.id)
        if (exists) {
          store.updateMessageStatus(data.id, "sent")
        } else {
          store.addMessage(toTeacherMessage(data))
        }

        await saveMessage(data)

        const cursor = `${data.created_at}|${data.id}`
        await setCursor(data.session_id, cursor)
      } catch {
        // silent
      }
    })

    es.onerror = () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => {
        const id = useTeacherStore.getState().activeSessionId
        if (id) deltaSync(id)
      }, 2000)
    }

    return () => {
      es.close()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [activeSessionId])
}
