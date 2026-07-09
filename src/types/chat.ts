export interface ChatModel {
  id: string
  title: string
  description: string
}

export interface ChatSession {
  id: string
  title: string
  timestamp: number
  created_at?: string
  updated_at?: string
}

export type MessageStatus = "sending" | "sent" | "failed"

export interface ChatMessageRecord {
  id: string
  session_id: string
  role: "user" | "assistant"
  content: string
  type: string
  created_at: string
  status?: MessageStatus
}

export interface ChatSessionRecord {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type AttachmentType = "audio" | "image" | "video" | "document" | "google-photos"

export interface Attachment {
  id: string
  type: AttachmentType
  name: string
  url?: string
  thumbnailUrl?: string
}

export interface ChatHistoryGroup {
  label: "Сегодня" | "Вчера" | "Давно"
  sessions: ChatSession[]
}
