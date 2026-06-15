"use client"

import type { ConversationWithMember, MessageWithAttachments, PendingMessage } from "./types"

const DB_NAME = "mmt-user-chat"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("conversations")) {
        db.createObjectStore("conversations", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("messages")) {
        const store = db.createObjectStore("messages", { keyPath: "id" })
        store.createIndex("conversation_id", "conversation_id", { unique: false })
        store.createIndex("created_at", "created_at", { unique: false })
      }
      if (!db.objectStoreNames.contains("cursors")) {
        db.createObjectStore("cursors", { keyPath: "conversationId" })
      }
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "client_message_id" })
      }
      if (!db.objectStoreNames.contains("presence")) {
        db.createObjectStore("presence", { keyPath: "user_id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// --- Conversations ---

export async function loadConversations(): Promise<ConversationWithMember[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readonly")
    const req = tx.objectStore("conversations").getAll()
    req.onsuccess = () => {
      resolve(req.result as ConversationWithMember[])
      db.close()
    }
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

export async function saveConversations(conversations: ConversationWithMember[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readwrite")
    const store = tx.objectStore("conversations")
    for (const c of conversations) store.put(c)
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })
}

export async function saveConversation(conversation: ConversationWithMember): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readwrite")
    const req = tx.objectStore("conversations").put(conversation)
    req.onsuccess = () => { resolve(); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

// --- Messages ---

export async function loadMessages(conversationId: string): Promise<MessageWithAttachments[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly")
    const index = tx.objectStore("messages").index("conversation_id")
    const req = index.getAll(conversationId)
    req.onsuccess = () => {
      const all = req.result as MessageWithAttachments[]
      const sorted = all.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      const keep = sorted.slice(-100)
      resolve(keep)
      db.close()
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

async function pruneConversationMessages(conversationId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite")
    const index = tx.objectStore("messages").index("conversation_id")
    const req = index.getAll(conversationId)
    req.onsuccess = () => {
      const all = (req.result as MessageWithAttachments[]).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      const overflow = Math.max(0, all.length - 100)
      if (overflow === 0) {
        db.close()
        resolve()
        return
      }
      const toDelete = all.slice(0, overflow)
      const store = tx.objectStore("messages")
      for (const m of toDelete) store.delete(m.id)
      tx.oncomplete = () => { resolve(); db.close() }
      tx.onerror = () => { reject(tx.error); db.close() }
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function saveMessage(message: MessageWithAttachments): Promise<void> {
  await saveMessages([message])
}

export async function saveMessages(messages: MessageWithAttachments[]): Promise<void> {
  const db = await openDB()
  const conversationIds = new Set<string>()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite")
    const store = tx.objectStore("messages")
    for (const msg of messages) {
      store.put(msg)
      conversationIds.add(msg.conversation_id)
    }
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })

  for (const cid of conversationIds) {
    try {
      await pruneConversationMessages(cid)
    } catch {
      // silent
    }
  }
}

// --- Cursors ---

export async function getCursor(conversationId: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cursors", "readonly")
    const req = tx.objectStore("cursors").get(conversationId)
    req.onsuccess = () => {
      const result = req.result as { conversationId: string; cursor: string } | undefined
      resolve(result?.cursor ?? null)
      db.close()
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function setCursor(conversationId: string, cursor: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cursors", "readwrite")
    const req = tx.objectStore("cursors").put({ conversationId, cursor })
    req.onsuccess = () => { resolve(); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

// --- Pending Messages ---

export async function loadPendingMessages(): Promise<PendingMessage[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending", "readonly")
    const req = tx.objectStore("pending").getAll()
    req.onsuccess = () => {
      resolve(req.result as PendingMessage[])
      db.close()
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function savePendingMessage(message: PendingMessage): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending", "readwrite")
    const req = tx.objectStore("pending").put(message)
    req.onsuccess = () => { resolve(); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function removePendingMessage(clientMessageId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending", "readwrite")
    const req = tx.objectStore("pending").delete(clientMessageId)
    req.onsuccess = () => { resolve(); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

// --- Presence ---

export async function savePresence(userId: string, online: boolean): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("presence", "readwrite")
    const req = tx.objectStore("presence").put({ user_id: userId, online })
    req.onsuccess = () => { resolve(); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function loadPresence(): Promise<Record<string, boolean>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("presence", "readonly")
    const req = tx.objectStore("presence").getAll()
    req.onsuccess = () => {
      const items = req.result as { user_id: string; online: boolean }[]
      const map: Record<string, boolean> = {}
      for (const item of items) map[item.user_id] = item.online
      resolve(map)
      db.close()
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

// --- Clear ---

export async function clearConversationData(conversationId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite")
    const index = tx.objectStore("messages").index("conversation_id")
    const req = index.openCursor(conversationId)
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
        db.close()
      }
    }
    req.onerror = () => { reject(req.error); db.close() }
  })
}
