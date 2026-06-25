import type { MessageWithAttachments } from "@/lib/user-chat/types"

export type DeliveryStatus = "sent" | "delivered" | "read"

export interface BubbleEntry {
  kind: "bubble"
  message: MessageWithAttachments
  isFirstInGroup: boolean
  isLastInGroup: boolean
  showAvatar: boolean
  showName: boolean
  delivery: DeliveryStatus | null
}

export interface DateSeparatorEntry {
  kind: "date"
  label: string
  iso: string
}

export interface SystemEntry {
  kind: "system"
  text: string
  iso: string
}

export type ChatEntry = BubbleEntry | DateSeparatorEntry | SystemEntry

export function formatDateLabel(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.floor(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  )
  if (diffDays === 0) return "Сегодня"
  if (diffDays === 1) return "Вчера"
  if (diffDays < 7) {
    return date.toLocaleDateString("ru-RU", { weekday: "long" })
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

export function findRecipientLastReadIndex(
  messages: MessageWithAttachments[],
  recipientLastReadMessageId: string | null,
): number {
  if (!recipientLastReadMessageId) return -1
  return messages.findIndex((m) => m.id === recipientLastReadMessageId)
}

export function groupMessages(
  messages: MessageWithAttachments[],
  currentUserId: string | null,
  options: {
    recipientLastReadMessageId: string | null
    recipientName?: string | null
    recipientOnline?: boolean
  },
): ChatEntry[] {
  const { recipientLastReadMessageId, recipientName, recipientOnline = false } = options
  const entries: ChatEntry[] = []

  let prevSender: string | null = null
  let prevDay: string | null = null

  const readIndex = findRecipientLastReadIndex(messages, recipientLastReadMessageId)

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const next = messages[i + 1]

    const day = dayKey(msg.created_at)
    if (day !== prevDay) {
      entries.push({
        kind: "date",
        label: formatDateLabel(msg.created_at),
        iso: msg.created_at,
      })
      prevDay = day
      prevSender = null
    }

    if (msg.message_type === "system") {
      entries.push({
        kind: "system",
        text: msg.content ?? "",
        iso: msg.created_at,
      })
      prevSender = null
      continue
    }

    const isFromMe = currentUserId !== null && msg.sender_id === currentUserId
    const isLastInGroup =
      !next ||
      next.message_type === "system" ||
      next.sender_id !== msg.sender_id ||
      dayKey(next.created_at) !== day

    const isFirstInGroup = prevSender !== msg.sender_id

    const showAvatar = !isFromMe && isLastInGroup
    const showName = !isFromMe && isFirstInGroup && !!recipientName

    let delivery: DeliveryStatus | null = null
    if (isFromMe) {
      if (readIndex >= 0 && i <= readIndex) {
        delivery = "read"
      } else if (recipientOnline) {
        delivery = "delivered"
      } else {
        delivery = "sent"
      }
    }

    entries.push({
      kind: "bubble",
      message: msg,
      isFirstInGroup,
      isLastInGroup,
      showAvatar,
      showName,
      delivery,
    })

    prevSender = msg.sender_id
  }

  return entries
}
