"use client"

import { create } from "zustand"
import type {
  ConversationWithMember,
  MessageWithAttachments,
  PendingMessage,
  PresenceState,
  TypingState,
  SyncCursor,
} from "./types"

interface UserChatState {
  conversations: ConversationWithMember[]
  activeConversationId: string | null
  messagesByConversation: Record<string, MessageWithAttachments[]>
  pendingMessages: PendingMessage[]
  presenceState: Record<string, boolean>
  typingState: Record<string, TypingState>
  syncCursors: Record<string, string>
  hasMoreByConversation: Record<string, boolean>
  loadingOlderByConversation: Record<string, boolean>
  isUsernameSet: boolean
  username: string | null
  isLoading: boolean

  setConversations: (conversations: ConversationWithMember[]) => void
  upsertConversation: (conversation: ConversationWithMember) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, messages: MessageWithAttachments[]) => void
  prependMessages: (conversationId: string, messages: MessageWithAttachments[]) => void
  addMessage: (conversationId: string, message: MessageWithAttachments) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageWithAttachments>) => void
  setHasMore: (conversationId: string, hasMore: boolean) => void
  setLoadingOlder: (conversationId: string, loading: boolean) => void
  addPendingMessage: (message: PendingMessage) => void
  removePendingMessage: (clientMessageId: string) => void
  updatePendingStatus: (clientMessageId: string, status: PendingMessage["status"]) => void
  setPresence: (userId: string, online: boolean) => void
  setTyping: (conversationId: string, userId: string, username: string) => void
  clearTyping: (conversationId: string, userId: string) => void
  setCursor: (conversationId: string, cursor: string) => void
  setUsernameState: (isSet: boolean, username: string | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useUserChatStore = create<UserChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messagesByConversation: {},
  pendingMessages: [],
  presenceState: {},
  typingState: {},
  syncCursors: {},
  hasMoreByConversation: {},
  loadingOlderByConversation: {},
  isUsernameSet: false,
  username: null,
  isLoading: false,

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conversation) => {
    set((state) => {
      const existing = state.conversations.findIndex((c) => c.id === conversation.id)
      if (existing >= 0) {
        const updated = [...state.conversations]
        updated[existing] = conversation
        return { conversations: updated }
      }
      return { conversations: [conversation, ...state.conversations] }
    })
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) => {
    set((state) => {
      const seen = new Set<string>()
      const sorted = [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      const deduped = sorted.filter((m) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: deduped,
        },
      }
    })
  },

  prependMessages: (conversationId, messages) => {
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? []
      const seen = new Set(existing.map((m) => m.id))
      const fresh = messages.filter((m) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      if (fresh.length === 0) return state
      const merged = [...fresh, ...existing].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: merged,
        },
      }
    })
  },

  setHasMore: (conversationId, hasMore) => {
    set((state) => ({
      hasMoreByConversation: { ...state.hasMoreByConversation, [conversationId]: hasMore },
    }))
  },

  setLoadingOlder: (conversationId, loading) => {
    set((state) => ({
      loadingOlderByConversation: {
        ...state.loadingOlderByConversation,
        [conversationId]: loading,
      },
    }))
  },

  addMessage: (conversationId, message) => {
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? []
      const deduped = existing.filter(
        (m) => m.id !== message.id && m.client_message_id !== message.client_message_id,
      )
      const merged = [...deduped, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: merged,
        },
      }
    })
  },

  updateMessage: (conversationId, messageId, updates) => {
    set((state) => {
      const messages = state.messagesByConversation[conversationId]
      if (!messages) return state
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m,
          ),
        },
      }
    })
  },

  addPendingMessage: (message) => {
    set((state) => ({
      pendingMessages: [...state.pendingMessages, message],
    }))
  },

  removePendingMessage: (clientMessageId) => {
    set((state) => ({
      pendingMessages: state.pendingMessages.filter(
        (m) => m.client_message_id !== clientMessageId,
      ),
    }))
  },

  updatePendingStatus: (clientMessageId, status) => {
    set((state) => ({
      pendingMessages: state.pendingMessages.map((m) =>
        m.client_message_id === clientMessageId ? { ...m, status } : m,
      ),
    }))
  },

  setPresence: (userId, online) => {
    set((state) => ({
      presenceState: { ...state.presenceState, [userId]: online },
    }))
  },

  setTyping: (conversationId, userId, username) => {
    set((state) => ({
      typingState: {
        ...state.typingState,
        [userId]: { conversation_id: conversationId, user_id: userId, username },
      },
    }))
  },

  clearTyping: (conversationId, userId) => {
    set((state) => {
      const updated = { ...state.typingState }
      delete updated[userId]
      return { typingState: updated }
    })
  },

  setCursor: (conversationId, cursor) => {
    set((state) => ({
      syncCursors: { ...state.syncCursors, [conversationId]: cursor },
    }))
  },

  setUsernameState: (isSet, username) => set({ isUsernameSet: isSet, username }),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => {
    set({
      conversations: [],
      activeConversationId: null,
      messagesByConversation: {},
      pendingMessages: [],
      presenceState: {},
      typingState: {},
      syncCursors: {},
      hasMoreByConversation: {},
      loadingOlderByConversation: {},
    })
  },
}))
