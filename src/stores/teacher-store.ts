import { create } from "zustand"
import type { TeacherMessage, MessageStatus } from "@/types/teacher"
import type { ChatSessionRecord, ChatMessageRecord } from "@/types/chat"

const SESSION_KEY = "active_session_id"

interface TeacherState {
  messages: TeacherMessage[]
  sessions: ChatSessionRecord[]
  activeSessionId: string | null
  sessionsLoading: boolean
  isLoading: boolean
  error: string | null
  addMessage: (msg: TeacherMessage) => void
  addMessages: (msgs: TeacherMessage[]) => void
  updateMessageStatus: (id: string, status: MessageStatus) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  hydrate: () => void
  reset: () => void
  setActiveSession: (id: string | null) => void
  setSessions: (sessions: ChatSessionRecord[]) => void
  setSessionsLoading: (loading: boolean) => void
  setMessages: (messages: TeacherMessage[]) => void
  loadSessionMessages: (sessionId: string) => Promise<void>
  createSession: () => Promise<string | null>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
}

export const useTeacherStore = create<TeacherState>((set, get) => ({
  messages: [],
  sessions: [],
  activeSessionId: null,
  sessionsLoading: false,
  isLoading: false,
  error: null,

  addMessage: (msg) => {
    set((state) => ({ messages: [...state.messages, msg], error: null }))
  },

  addMessages: (msgs) => {
    set((state) => {
      const existing = new Set(state.messages.map((m) => m.id))
      const newMsgs = msgs.filter((m) => !existing.has(m.id))
      if (newMsgs.length === 0) return state
      return { messages: [...state.messages, ...newMsgs], error: null }
    })
  },

  updateMessageStatus: (id, status) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status } : m
      ),
    }))
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSessions: (sessions) => set({ sessions }),
  setSessionsLoading: (loading) => set({ sessionsLoading: loading }),
  setMessages: (messages) => {
    set({ messages })
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id })
    if (typeof window !== "undefined" && id) {
      window.sessionStorage.setItem(SESSION_KEY, id)
    }
  },

  hydrate: () => {
    if (typeof window === "undefined") return
    const activeId = window.sessionStorage.getItem(SESSION_KEY)
    if (activeId) {
      set({ activeSessionId: activeId })
    }
  },

  reset: () => {
    set({ messages: [], isLoading: false, error: null })
  },

  loadSessionMessages: async (sessionId) => {
    try {
      set({ isLoading: true, error: null })
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      const json = await res.json()
      if (json.status === "success" && Array.isArray(json.data)) {
        const messages: TeacherMessage[] = json.data.map((m: ChatMessageRecord) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
          type: m.type as TeacherMessage["type"],
        }))
        set({ messages })
      } else {
        set({ error: json.error ?? "Failed to load messages" })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Network error" })
    } finally {
      set({ isLoading: false })
    }
  },

  createSession: async () => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый чат" }),
      })
      const json = await res.json()
      if (json.status === "success" && json.data) {
        const session = json.data as ChatSessionRecord
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
          messages: [],
        }))
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(SESSION_KEY, session.id)
        }
        return session.id
      }
      return null
    } catch {
      return null
    }
  },

  deleteSession: async (id) => {
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" })
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== id)
        const isActive = state.activeSessionId === id
        return {
          sessions,
          activeSessionId: isActive ? (sessions[0]?.id ?? null) : state.activeSessionId,
          messages: isActive ? [] : state.messages,
        }
      })
    } catch {
      // silent
    }
  },

  renameSession: async (id, title) => {
    try {
      await fetch(`/api/chat/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, title } : s
        ),
      }))
    } catch {
      // silent
    }
  },
}))
