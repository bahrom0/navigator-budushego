import type { ReactNode } from "react"
import type {
  CommunityScope,
  ConversationWithMember,
  MessageWithAttachments,
  PendingMessage,
  TypingState,
  UserProfile,
} from "@/lib/user-chat/types"

export interface ConversationListProps {
  conversations: ConversationWithMember[]
  activeConversationId: string | null
  presenceState: Record<string, boolean>
  isLoading: boolean
  communityTitle?: string | null
  communityDescription?: string | null
  communityFilters?: CommunityFilterOption[]
  activeCommunityFilter?: CommunityScope | null
  searchQuery: string
  searchResults: UserProfile[]
  searchLoading: boolean
  searched: boolean
  resultsLabel?: string | null
  onSelectConversation: (id: string) => void
  onSearch: (query: string) => void
  onToggleCommunityFilter?: (scope: CommunityScope) => void
  onStartConversation: (userId: string) => void
}

export interface CommunityFilterOption {
  id: CommunityScope
  label: string
  helper?: string
}

export interface ChatHeaderProps {
  displayName: string | null
  username: string | null
  isOnline: boolean
  isTyping: TypingState | null
  lastSeenAt: string | null
  onOpenProfile?: () => void
  onOpenSearch?: () => void
  onOpenMenu?: () => void
  onBack?: () => void
}

export interface ChatPanelProps {
  activeConversationId: string | null
  messages: MessageWithAttachments[]
  pendingMessages: PendingMessage[]
  currentUserId: string | null
  emptyState?: ReactNode
  input: string
  typingUsername: string
  onInputChange: (value: string) => void
  onSend: () => void
  onEdit: (messageId: string, content: string) => Promise<void> | void
  onDelete?: (messageId: string) => Promise<void> | void
  onReply?: (messageId: string) => void
  onCopy?: (messageId: string) => void
  onForward?: (messageId: string) => void
  renderActions?: (messageId: string, content: string) => ReactNode
  recipientLastReadMessageId?: string | null
  recipientName?: string | null
  recipientOnline?: boolean
  replyTo?: ReplyTargetLike | null
  onCancelReply?: () => void
  isMobile?: boolean
}

export interface ReplyTargetLike {
  messageId: string
  senderName: string
  preview: string
}

export interface ReplyPreview {
  text: string | null
  senderName: string | null
  deleted: boolean
}

export interface ChatLayoutProps {
  sidebar: ReactNode
  panel: ReactNode
}
