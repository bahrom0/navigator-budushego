"use client"

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Loader2, MoreHorizontal, UserPlus, X as XIcon } from "lucide-react"
import type { ChatPanelProps } from "./types-ui"
import { ChatComposer } from "./chat-composer"
import {
  MessageBubble,
  PendingBubble,
  TypingBubble,
  SystemMessage,
  ReplyAvatar,
  type ReplyPreview,
} from "./message-bubble"
import { groupMessages } from "./grouping"
import { MessageActionsMenu } from "./message-actions-menu"
import { MessageInfo, type MessageInfoData } from "./message-info"
import { ScrollToBottomButton } from "./scroll-to-bottom-button"
import { useUserChatStore } from "@/lib/user-chat/store"
import { loadOlderMessages } from "@/lib/user-chat/sync"
import { useMessageSelectionStore } from "@/stores/message-selection-store"

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ChatPanel(props: ChatPanelProps) {
  const {
    activeConversationId,
    messages,
    pendingMessages,
    currentUserId,
    emptyState,
    input,
    typingUsername,
    onInputChange,
    onSend,
    onEdit,
    onDelete,
    onReply,
    onCopy,
    onForward,
    renderActions,
    recipientLastReadMessageId = null,
    recipientName = null,
    recipientOnline = false,
    replyTo = null,
    onCancelReply,
    isMobile = false,
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [infoData, setInfoData] = useState<MessageInfoData | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messageAnchorRefs = useRef<Map<string, HTMLElement>>(new Map())
  const bubbleAnchorRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [unseenDelta, setUnseenDelta] = useState(0)
  const lastSeenCountRef = useRef(0)
  const prevScrollHeightRef = useRef<number>(0)
  const prevConvIdRef = useRef<string | null>(null)

  const hasMore = useUserChatStore(
    (s) => (activeConversationId ? s.hasMoreByConversation[activeConversationId] !== false : false),
  )
  const loadingOlder = useUserChatStore(
    (s) => !!activeConversationId && !!s.loadingOlderByConversation[activeConversationId],
  )

  const selectionMode = useMessageSelectionStore((s) => s.mode)
  const selectedIds = useMessageSelectionStore((s) => s.selected)
  const highlightedId = useMessageSelectionStore((s) => s.highlightedId)
  const enterSelection = useMessageSelectionStore((s) => s.enter)
  const exitSelection = useMessageSelectionStore((s) => s.exit)
  const toggleSelect = useMessageSelectionStore((s) => s.toggle)
  const setHighlight = useMessageSelectionStore((s) => s.setHighlight)

  useEffect(() => {
    return () => exitSelection()
  }, [activeConversationId, exitSelection])

  useEffect(() => {
    if (!highlightedId) return
    const t = setTimeout(() => setHighlight(null), 1600)
    return () => clearTimeout(t)
  }, [highlightedId, setHighlight])

  const handleJumpToMessage = useCallback(
    (messageId: string) => {
      const el = messageAnchorRefs.current.get(messageId)
      const scroller = scrollRef.current
      if (!el || !scroller) return
      const elRect = el.getBoundingClientRect()
      const scrollerRect = scroller.getBoundingClientRect()
      const offset = elRect.top - scrollerRect.top + scroller.scrollTop - 80
      scroller.scrollTo({ top: offset, behavior: "smooth" })
      setHighlight(messageId)
    },
    [setHighlight],
  )

  const selectedCount = selectedIds.size
  const blurSingleSelection = selectionMode && selectedCount === 1
  const focusedMessageId = blurSingleSelection ? [...selectedIds][0] : null

  const entries = useMemo(
    () =>
      groupMessages(messages, currentUserId, {
        recipientLastReadMessageId,
        recipientName,
        recipientOnline,
      }),
    [messages, currentUserId, recipientLastReadMessageId, recipientName, recipientOnline],
  )

  const replyIndex = useMemo(() => {
    const map = new Map<string, ReplyPreview>()
    const byId = new Map<string, (typeof messages)[number]>()
    for (const m of messages) {
      byId.set(m.id, m)
    }
    for (const m of messages) {
      const parentId = (m as { reply_to_message_id?: string | null }).reply_to_message_id
      if (!parentId) continue
      if (map.has(parentId)) continue
      const parent = byId.get(parentId)
      if (!parent) continue
      map.set(parentId, {
        text: parent.content,
        senderName: parent.sender?.name ?? parent.sender?.username ?? null,
        deleted: !!parent.deleted_at,
      })
    }
    return map
  }, [messages])

  const handleLoadOlder = useCallback(() => {
    if (!activeConversationId) return
    const el = scrollRef.current
    if (!el) return
    prevScrollHeightRef.current = el.scrollHeight
    void loadOlderMessages(activeConversationId)
  }, [activeConversationId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !activeConversationId) return

    const isSwitchingConversation = prevConvIdRef.current !== activeConversationId

    if (isSwitchingConversation) {
      el.scrollTop = el.scrollHeight
      prevConvIdRef.current = activeConversationId
      lastSeenCountRef.current = entries.length + pendingMessages.length
      return
    }

    if (loadingOlder) {
      const prevHeight = prevScrollHeightRef.current
      const newHeight = el.scrollHeight
      el.scrollTop = newHeight - prevHeight
      return
    }

    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance < 120) {
      el.scrollTop = el.scrollHeight
    }
  }, [activeConversationId, entries.length, pendingMessages.length, loadingOlder])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !activeConversationId) return
    if (prevConvIdRef.current !== activeConversationId) return
    const total = entries.length + pendingMessages.length
    if (total === 0) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance > el.clientHeight * 0.5) {
      el.scrollTop = el.scrollHeight
    }
  }, [activeConversationId, entries.length, pendingMessages.length])

  const entriesRef = useRef(entries)
  const pendingLenRef = useRef(pendingMessages.length)
  const hasMoreRef = useRef(hasMore)
  const loadingOlderRef = useRef(loadingOlder)
  const activeConvRef = useRef(activeConversationId)
  const loadOlderRef = useRef(handleLoadOlder)

  entriesRef.current = entries
  pendingLenRef.current = pendingMessages.length
  hasMoreRef.current = hasMore
  loadingOlderRef.current = loadingOlder
  activeConvRef.current = activeConversationId
  loadOlderRef.current = handleLoadOlder

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      const nearBottom = distance < 200
      if (nearBottom) {
        setShowScrollButton(false)
        setUnseenDelta(0)
        lastSeenCountRef.current = entriesRef.current.length + pendingLenRef.current
      } else {
        setShowScrollButton(true)
        const current =
          entriesRef.current.filter((e) => e.kind === "bubble" || e.kind === "system").length +
          pendingLenRef.current
        const delta = Math.max(0, current - lastSeenCountRef.current)
        if (delta > 0) setUnseenDelta(delta)
      }

      if (
        hasMoreRef.current &&
        !loadingOlderRef.current &&
        el.scrollTop < 80 &&
        activeConvRef.current
      ) {
        loadOlderRef.current()
      }
    }

    el.addEventListener("scroll", update, { passive: true })
    update()
    return () => el.removeEventListener("scroll", update)
  }, [entries.length, pendingMessages.length, hasMore, loadingOlder, activeConversationId, handleLoadOlder])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  if (!activeConversationId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-1 items-center justify-center bg-background"
      >
        {emptyState ?? (
          <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
            <UserPlus className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-sm text-text-secondary">
            Выберите диалог или найдите пользователя
          </p>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background select-none">
      <div
        ref={scrollRef}
        className="relative chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain select-none"
      >
        <div className="mx-auto w-full max-w-[720px] px-5 pb-4 pt-6">
          {hasMore ? (
            <div className="flex justify-center pb-3">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={loadingOlder}
                className="flex h-9 items-center gap-2 rounded-full border border-border/60 bg-card-bg px-4 text-xs font-medium text-text-secondary transition-colors hover:bg-border/40 disabled:opacity-50"
              >
                {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loadingOlder ? "Загрузка..." : "Загрузить старые сообщения"}
              </button>
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {entries.map((entry, idx) => {
              if (entry.kind === "date") {
                return (
                  <motion.div
                    key={`date-${entry.iso}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="my-3 flex justify-center"
                  >
                    <span className="rounded-full bg-border/40 px-3 py-1 text-[11px] font-medium text-text-muted">
                      {entry.label}
                    </span>
                  </motion.div>
                )
              }
              if (entry.kind === "system") {
                return <SystemMessage key={`sys-${idx}`} text={entry.text} />
              }
              const msg = entry.message
              const isOwn = currentUserId === msg.sender_id
              const isDeleted = !!msg.deleted_at
              const isEditing = editingId === msg.id
              const replyToId = (msg as { reply_to_message_id?: string | null }).reply_to_message_id ?? null
              const replyPreview = replyToId ? replyIndex.get(replyToId) ?? null : null
              const senderDisplayName =
                msg.sender?.name ?? msg.sender?.username ?? recipientName ?? null
              const containerGap = entry.isFirstInGroup ? "mt-2" : "mt-0.5"
              const canEdit = isOwn && !isDeleted
              const menuOpen = openMenuId === msg.id
              const isSelected = selectedIds.has(msg.id)
              const isHighlighted = highlightedId === msg.id
              const isBlurTarget = blurSingleSelection && msg.id !== focusedMessageId
              const startLongPress = () => {
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = setTimeout(() => {
                  if (isMobile) {
                    if (!selectionMode) enterSelection(msg.id)
                  } else if (!selectionMode) {
                    setOpenMenuId(msg.id)
                  }
                }, 450)
              }
              const cancelLongPress = () => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current)
                  longPressTimerRef.current = null
                }
              }
              const handleBubbleClick = () => {
                if (selectionMode) {
                  toggleSelect(msg.id)
                }
              }
              return (
                <motion.div
                  key={msg.id}
                  ref={(el) => {
                    if (el) messageAnchorRefs.current.set(msg.id, el)
                    else messageAnchorRefs.current.delete(msg.id)
                  }}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={
                    isHighlighted
                      ? { opacity: 1, y: 0, scale: 1 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.6 }}
                  layout="position"
                  className={`group/msg flex w-full select-none ${isMobile ? "" : ""} ${containerGap} ${
                    isOwn ? "justify-end" : "justify-start"
                  } ${isBlurTarget ? "blur-sm opacity-30" : ""} ${
                    blurSingleSelection && msg.id === focusedMessageId ? "relative z-20" : ""
                  }`}
                  onContextMenu={(e) => {
                    if (isMobile) return
                    e.preventDefault()
                    if (!selectionMode) setOpenMenuId(msg.id)
                  }}
                  onTouchStart={startLongPress}
                  onTouchEnd={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onClick={handleBubbleClick}
                >
                  {selectionMode ? (
                    <div className="mr-2 flex w-7 shrink-0 items-center justify-center">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-text-muted/40 bg-card-bg"
                        }`}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </div>
                  ) : !isOwn ? (
                    <div className="mr-2 flex w-7 shrink-0 justify-end">
                      {entry.showAvatar ? (
                        <ReplyAvatar name={senderDisplayName} />
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    ref={(el) => {
                      if (el) bubbleAnchorRefs.current.set(msg.id, el)
                      else bubbleAnchorRefs.current.delete(msg.id)
                    }}
                    className="relative max-w-[70%]"
                  >
                    {isHighlighted ? (
                      <motion.div
                        aria-hidden
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.55, 0] }}
                        transition={{ duration: 1.4, times: [0, 0.4, 1], ease: "easeOut" }}
                        className="pointer-events-none absolute -inset-2 rounded-2xl bg-primary/25"
                      />
                    ) : null}
                    {isEditing ? (
                      <EditInput
                        value={editContent}
                        onChange={setEditContent}
                        onSubmit={() => {
                          void onEdit(msg.id, editContent)
                          setEditingId(null)
                          setEditContent("")
                        }}
                        onCancel={() => {
                          setEditingId(null)
                          setEditContent("")
                        }}
                      />
                    ) : (
                      <>
                        <MessageBubble
                          own={isOwn}
                          content={msg.content}
                          time={formatTime(msg.created_at)}
                          edited={!!msg.edited_at && !isDeleted}
                          deleted={isDeleted}
                          showAvatar={entry.showAvatar}
                          isFirstInGroup={entry.isFirstInGroup}
                          isLastInGroup={entry.isLastInGroup}
                          replyTo={replyPreview}
                          replyToId={replyToId}
                          onReplyClick={handleJumpToMessage}
                          delivery={entry.delivery}
                          senderName={entry.showName ? senderDisplayName : null}
                        />
                        {!isDeleted && !isMobile ? (
                          <>
                              <button
                                type="button"
                                aria-label="Действия с сообщением"
                                onClick={() => setOpenMenuId(msg.id)}
                                className={`absolute top-0 ${
                                  isOwn ? "-left-8" : "-right-8"
                                } hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-text-muted opacity-0 transition-opacity hover:bg-border/40 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 group-hover/msg:opacity-100 ${
                                  menuOpen ? "opacity-100" : ""
                                }`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            <AnimatePresence>
                              {menuOpen && bubbleAnchorRefs.current.get(msg.id) ? (
                                <MessageActionsMenu
                                  anchorRef={bubbleAnchorRefs.current.get(msg.id) as HTMLElement}
                                    own={isOwn}
                                    onClose={() => setOpenMenuId(null)}
                                    onReply={() => onReply?.(msg.id)}
                                    onCopy={() => onCopy?.(msg.id)}
                                    onEdit={
                                      canEdit
                                        ? () => {
                                            setEditingId(msg.id)
                                            setEditContent(msg.content ?? "")
                                          }
                                        : undefined
                                    }
                                    onDelete={
                                      isOwn
                                        ? () => onDelete?.(msg.id)
                                        : undefined
                                    }
                                    onForward={() => onForward?.(msg.id)}
                                    onInfo={() => {
                                      setInfoData({
                                        id: msg.id,
                                        content: msg.content,
                                        senderName: senderDisplayName,
                                        createdAt: msg.created_at,
                                        editedAt: msg.edited_at,
                                        deleted: isDeleted,
                                        delivery: entry.delivery,
                                        own: isOwn,
                                    })
                                  }}
                                />
                              ) : null}
                            </AnimatePresence>
                          </>
                        ) : null}
                        {isOwn && !isDeleted
                          ? renderActions?.(msg.id, msg.content ?? "")
                          : null}
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {pendingMessages.map((pm) => (
              <motion.div
                key={pm.client_message_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-0.5 flex justify-end ${blurSingleSelection ? "blur-sm opacity-30" : ""}`}
              >
                <PendingBubble content={pm.content} status={pm.status} />
              </motion.div>
            ))}
          </AnimatePresence>

          <div className={blurSingleSelection ? "blur-sm opacity-30" : ""}>
            <TypingBubble visible={!!typingUsername} />
          </div>
        </div>
        <ScrollToBottomButton
          visible={showScrollButton}
          unreadDelta={unseenDelta}
          onClick={() => {
            const el = scrollRef.current
            if (!el) return
            el.scrollTop = el.scrollHeight
            setShowScrollButton(false)
            setUnseenDelta(0)
            lastSeenCountRef.current =
              entriesRef.current.filter((e) => e.kind !== "date").length + pendingLenRef.current
          }}
        />
      </div>

      <AnimatePresence>
        {selectionMode ? (
          <motion.div
            key="selection-bar"
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex h-14 shrink-0 items-center justify-between border-t border-border bg-card-bg px-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exitSelection}
                aria-label="Отменить выбор"
                className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-text-secondary hover:bg-border/40"
              >
                <XIcon className="h-4 w-4" />
                <span>Отмена</span>
              </button>
              <span className="text-sm font-medium text-foreground">
                Выбрано: {selectedCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={selectedCount !== 1}
                onClick={() => {
                  const id = [...selectedIds][0]
                  if (id) onReply?.(id)
                  exitSelection()
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-border/40 disabled:opacity-40"
              >
                Ответить
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => {
                  for (const id of selectedIds) onCopy?.(id)
                  exitSelection()
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-border/40 disabled:opacity-40"
              >
                Копировать
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ChatComposer
        value={input}
        onChange={onInputChange}
        onSend={onSend}
        replyTo={replyTo ?? null}
        onCancelReply={onCancelReply}
      />
      <MessageInfo data={infoData} onClose={() => setInfoData(null)} />
    </div>
  )
}

interface EditInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

function EditInput({ value, onChange, onSubmit, onCancel }: EditInputProps) {
  return (
    <div className="flex gap-2 rounded-2xl border border-primary/30 bg-card-bg px-4 py-2.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onSubmit()
          }
          if (e.key === "Escape") onCancel()
        }}
        className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
        autoFocus
      />
      <button onClick={onSubmit} className="text-xs font-medium text-primary">
        OK
      </button>
    </div>
  )
}
