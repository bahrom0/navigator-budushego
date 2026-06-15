"use client"

import { useUserChatStore } from "./store"
import {
  loadMessages,
  saveMessages,
  loadConversations,
  saveConversations,
  loadPendingMessages,
  savePendingMessage,
  removePendingMessage,
} from "./db"
import type { MessageWithAttachments, ConversationWithMember, PendingMessage } from "./types"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function hydrateConversations(): Promise<void> {
  const cached = await loadConversations()
  if (cached.length > 0) {
    useUserChatStore.getState().setConversations(cached)
  }
}

export async function hydrateMessages(conversationId: string): Promise<void> {
  const cached = await loadMessages(conversationId)
  const store = useUserChatStore.getState()
  if (cached.length > 0) {
    store.setMessages(conversationId, cached)
    store.setHasMore(conversationId, cached.length >= MAX_CACHED_MESSAGES)
  } else {
    store.setHasMore(conversationId, false)
  }
}

export async function hydratePending(): Promise<void> {
  const pending = await loadPendingMessages()
  for (const msg of pending) {
    useUserChatStore.getState().addPendingMessage(msg)
  }
}

export const INITIAL_MESSAGE_LIMIT = 20
export const MAX_CACHED_MESSAGES = 100

export async function deltaSync(conversationId: string): Promise<void> {
  try {
    const res = await fetch(
      `/api/user-chat/conversations/${conversationId}/messages?limit=${INITIAL_MESSAGE_LIMIT}`,
      { cache: "no-store" },
    )
    const json = await res.json()
    if (json.status !== "success" || !Array.isArray(json.data)) return
    if (json.data.length === 0) return

    const records = json.data as MessageWithAttachments[]
    const store = useUserChatStore.getState()

    const existing = store.messagesByConversation[conversationId] ?? []
    if (existing.length === 0) {
      store.setMessages(conversationId, records)
    } else {
      for (const record of records) {
        store.addMessage(conversationId, record)
      }
    }

    store.setHasMore(conversationId, json.has_more === true)
    await saveMessages(records)
  } catch {
    // silent
  }
}

export async function loadOlderMessages(conversationId: string): Promise<void> {
  const store = useUserChatStore.getState()
  if (store.loadingOlderByConversation[conversationId]) return
  if (store.hasMoreByConversation[conversationId] === false) return

  const messages = store.messagesByConversation[conversationId] ?? []
  if (messages.length === 0) return

  const oldest = messages[0]
  const cursor = `${oldest.created_at}|${oldest.id}`

  store.setLoadingOlder(conversationId, true)
  try {
    const res = await fetch(
      `/api/user-chat/conversations/${conversationId}/messages?before=${encodeURIComponent(cursor)}&limit=${INITIAL_MESSAGE_LIMIT}`,
      { cache: "no-store" },
    )
    const json = await res.json()
    if (json.status !== "success" || !Array.isArray(json.data)) return
    if (json.data.length === 0) {
      store.setHasMore(conversationId, false)
      return
    }

    store.prependMessages(conversationId, json.data as MessageWithAttachments[])
    store.setHasMore(conversationId, json.has_more === true)
    await saveMessages(json.data as MessageWithAttachments[])
  } catch {
    // silent
  } finally {
    store.setLoadingOlder(conversationId, false)
  }
}

export async function fetchConversations(): Promise<void> {
  try {
    useUserChatStore.getState().setLoading(true)
    const res = await fetch("/api/user-chat/conversations")
    const json = await res.json()
    if (json.status === "success" && Array.isArray(json.data)) {
      const records = json.data as ConversationWithMember[]
      useUserChatStore.getState().setConversations(records)
      await saveConversations(records)
    }
  } catch {
    // silent
  } finally {
    useUserChatStore.getState().setLoading(false)
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: MessageWithAttachments["message_type"] = "text",
  replyToMessageId: string | null = null,
): Promise<void> {
  const clientMessageId = generateId()
  const store = useUserChatStore.getState()

  const pending: PendingMessage = {
    id: clientMessageId,
    conversation_id: conversationId,
    client_message_id: clientMessageId,
    content,
    message_type: messageType,
    status: "sending",
    created_at: new Date().toISOString(),
    reply_to_message_id: replyToMessageId,
  }

  store.addPendingMessage(pending)
  await savePendingMessage(pending)

  try {
    const res = await fetch(`/api/user-chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_message_id: clientMessageId,
        content,
        message_type: messageType,
        reply_to_message_id: replyToMessageId,
      }),
    })

    const json = await res.json()
    if (json.status === "success") {
      store.removePendingMessage(clientMessageId)
      await removePendingMessage(clientMessageId)
      if (json.data) {
        store.addMessage(conversationId, json.data as MessageWithAttachments)
        await saveMessages([json.data as MessageWithAttachments])
      }
    } else {
      store.updatePendingStatus(clientMessageId, "failed")
      await savePendingMessage({ ...pending, status: "failed" })
    }
  } catch {
    store.updatePendingStatus(clientMessageId, "failed")
    await savePendingMessage({ ...pending, status: "failed" })
  }
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<void> {
  const store = useUserChatStore.getState()
  store.updateMessage(conversationId, messageId, { content, edited_at: new Date().toISOString() })

  try {
    const res = await fetch(
      `/api/user-chat/conversations/${conversationId}/messages/${messageId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    )
    const json = await res.json()
    if (json.status === "success" && json.data) {
      store.updateMessage(conversationId, messageId, json.data as Partial<MessageWithAttachments>)
      await saveMessages([json.data as MessageWithAttachments])
    }
  } catch {
    // silent
  }
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  const store = useUserChatStore.getState()
  store.updateMessage(conversationId, messageId, { deleted_at: new Date().toISOString() })

  try {
    await fetch(
      `/api/user-chat/conversations/${conversationId}/messages/${messageId}`,
      { method: "DELETE" },
    )
  } catch {
    // silent
  }
}
