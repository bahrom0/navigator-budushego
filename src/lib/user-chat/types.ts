export interface UserProfile {
  id: string
  user_id: string
  username: string | null
  email: string | null
  name: string | null
  level: string
  avatar_url?: string | null
  active_goal_id?: string | null
  community_context?: UserCommunityContext | null
  match_reasons?: string[]
}

export type CommunityScope = "goal" | "university" | "city" | "week"

export interface UserCommunityContext {
  goal_id: string | null
  nct_code: string | null
  nct_title: string | null
  university: string | null
  city: string | null
  current_week_number: number | null
}

export interface ConversationRecord {
  id: string
  created_at: string
  updated_at: string
  last_message_at: string
  is_group: boolean
  title: string | null
}

export interface ConversationMemberRecord {
  conversation_id: string
  user_id: string
  joined_at: string
  last_read_at: string | null
  last_read_message_id: string | null
  role: "member" | "admin"
}

export interface MessageRecord {
  id: string
  conversation_id: string
  sender_id: string
  client_message_id: string
  content: string | null
  message_type: "text" | "image" | "video" | "audio" | "document" | "system"
  created_at: string
  updated_at: string
  edited_at: string | null
  deleted_at: string | null
  reply_to_message_id?: string | null
}

export interface AttachmentRecord {
  id: string
  message_id: string
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  thumbnail_url: string | null
  created_at: string
}

export interface MessageEditRecord {
  id: string
  message_id: string
  previous_content: string
  edited_at: string
}

export interface ConversationWithMember extends ConversationRecord {
  other_member?: UserProfile
  other_member_last_read_message_id?: string | null
  last_message?: MessageRecord
  unread_count?: number
}

export interface MessageWithAttachments extends MessageRecord {
  attachments?: AttachmentRecord[]
  sender?: UserProfile
}

export type MessageStatus = "sending" | "sent" | "failed"

export interface PendingMessage {
  id: string
  conversation_id: string
  client_message_id: string
  content: string
  message_type: MessageRecord["message_type"]
  status: MessageStatus
  created_at: string
  attachments?: { file: File; name: string }[]
  reply_to_message_id?: string | null
}

export interface SyncCursor {
  conversationId: string
  cursor: string
}

export interface PresenceState {
  user_id: string
  online: boolean
  last_seen: string | null
}

export interface TypingState {
  conversation_id: string
  user_id: string
  username: string
}
