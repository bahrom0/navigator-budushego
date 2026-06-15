import type { ChatMessageRecord } from "@/types/chat"
import type { ProfileData } from "@/types/profile"

const DB_NAME = "mmt-chat"
const DB_VERSION = 2

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("messages")) {
        const store = db.createObjectStore("messages", { keyPath: "id" })
        store.createIndex("session_id", "session_id", { unique: false })
        store.createIndex("created_at", "created_at", { unique: false })
      }
      if (!db.objectStoreNames.contains("cursors")) {
        db.createObjectStore("cursors", { keyPath: "sessionId" })
      }
      if (!db.objectStoreNames.contains("profile")) {
        db.createObjectStore("profile", { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  name: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode)
    const req = fn(tx.objectStore(name))
    req.onsuccess = () => {
      resolve(req.result)
      db.close()
    }
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

async function withStoreAndIndex<T>(
  storeName: string,
  indexName: string,
  mode: IDBTransactionMode,
  fn: (index: IDBIndex) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const req = fn(tx.objectStore(storeName).index(indexName))
    req.onsuccess = () => {
      resolve(req.result)
      db.close()
    }
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

export async function loadMessages(sessionId: string): Promise<ChatMessageRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly")
    const index = tx.objectStore("messages").index("session_id")
    const req = index.getAll(sessionId)

    req.onsuccess = () => {
      const messages = (req.result as ChatMessageRecord[]).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      resolve(messages)
      db.close()
    }
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

export async function saveMessage(message: ChatMessageRecord): Promise<void> {
  await withStore("messages", "readwrite", (store) => store.put(message))
}

export async function saveMessages(messages: ChatMessageRecord[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite")
    const store = tx.objectStore("messages")
    for (const msg of messages) {
      store.put(msg)
    }
    tx.oncomplete = () => {
      resolve()
      db.close()
    }
    tx.onerror = () => {
      reject(tx.error)
      db.close()
    }
  })
}

export async function removeMessage(messageId: string): Promise<void> {
  await withStore("messages", "readwrite", (store) => store.delete(messageId))
}

export async function clearSessionMessages(sessionId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite")
    const index = tx.objectStore("messages").index("session_id")
    const req = index.openCursor(sessionId)

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
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

export async function getCursor(sessionId: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cursors", "readonly")
    const req = tx.objectStore("cursors").get(sessionId)

    req.onsuccess = () => {
      const result = req.result as { sessionId: string; cursor: string } | undefined
      resolve(result?.cursor ?? null)
      db.close()
    }
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

export async function setCursor(sessionId: string, cursor: string): Promise<void> {
  await withStore("cursors", "readwrite", (store) => store.put({ sessionId, cursor }))
}

export async function saveProfile(data: ProfileData): Promise<void> {
  await withStore("profile", "readwrite", (store) => store.put({ key: "data", value: data }))
}

export async function loadProfile(): Promise<ProfileData | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("profile", "readonly")
    const req = tx.objectStore("profile").get("data")
    req.onsuccess = () => {
      const result = req.result as { key: string; value: ProfileData } | undefined
      resolve(result?.value ?? null)
      db.close()
    }
    req.onerror = () => {
      reject(req.error)
      db.close()
    }
  })
}

export async function clearProfile(): Promise<void> {
  await withStore("profile", "readwrite", (store) => store.delete("data"))
}
