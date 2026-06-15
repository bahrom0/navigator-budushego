"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, UserCheck, Check, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { useUserChatStore } from "@/lib/user-chat/store"
import { useReplyStore } from "@/lib/user-chat/reply-store"
import { useMobileChatNavStore } from "@/stores/mobile-chat-nav-store"
import { userChatRealtime } from "@/lib/user-chat/realtime"
import {
  hydrateConversations,
  hydrateMessages,
  hydratePending,
  deltaSync,
  fetchConversations,
  sendMessage,
  editMessage,
  deleteMessage,
} from "@/lib/user-chat/sync"
import { ConversationList } from "@/components/user-chat/conversation-list"
import { ChatHeader } from "@/components/user-chat/chat-header"
import { ChatPanel } from "@/components/user-chat/chat-panel"
import { UserProfilePanel } from "@/components/user-chat/user-profile-panel"
import type { MessageWithAttachments, UserProfile } from "@/lib/user-chat/types"
import type { ReplyTargetLike } from "@/components/user-chat/types-ui"

export default function UserChatPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authLoading = useAuthStore((s) => s.isLoading)
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const authUser = useAuthStore((s) => s.user)

  const conversations = useUserChatStore((s) => s.conversations)
  const activeConversationId = useUserChatStore((s) => s.activeConversationId)
  const messagesByConversation = useUserChatStore((s) => s.messagesByConversation)
  const isUsernameSet = useUserChatStore((s) => s.isUsernameSet)
  const username = useUserChatStore((s) => s.username)
  const isLoading = useUserChatStore((s) => s.isLoading)
  const pendingMessages = useUserChatStore((s) => s.pendingMessages)
  const presenceState = useUserChatStore((s) => s.presenceState)
  const typingState = useUserChatStore((s) => s.typingState)
  const setActiveConversation = useUserChatStore((s) => s.setActiveConversation)
  const setUsernameState = useUserChatStore((s) => s.setUsernameState)
  const addMessage = useUserChatStore((s) => s.addMessage)
  const setPresence = useUserChatStore((s) => s.setPresence)
  const setTyping = useUserChatStore((s) => s.setTyping)
  const clearTyping = useUserChatStore((s) => s.clearTyping)

  const reply = useReplyStore((s) => s.reply)
  const setReply = useReplyStore((s) => s.setReply)
  const clearReply = useReplyStore((s) => s.clearReply)

  const USERNAME_CACHE_KEY = "userchat_username"

  const [mounted, setMounted] = useState(false)
  const [input, setInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const mobileNavOpen = useMobileChatNavStore((s) => s.isOpen)
  const openMobileNav = useMobileChatNavStore((s) => s.open)
  const closeMobileNav = useMobileChatNavStore((s) => s.close)
  const [isMobile, setIsMobile] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<{
    user_id: string
    username: string | null
    name: string | null
    bio: string | null
    avatar_url: string | null
    level: string
    last_seen_at: string | null
  } | null>(null)
  const [profileFetchLoading, setProfileFetchLoading] = useState(false)
  const [profileFetchError, setProfileFetchError] = useState<string | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync localStorage cache on username state change
  useEffect(() => {
    if (typeof window === "undefined") return
    const unsub = useUserChatStore.subscribe((state) => {
      if (state.isUsernameSet && state.username) {
        window.localStorage.setItem(USERNAME_CACHE_KEY, state.username)
      } else if (!state.isUsernameSet) {
        window.localStorage.removeItem(USERNAME_CACHE_KEY)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    hydrateAuth()
    setMounted(true)
  }, [hydrateAuth])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(max-width: 767px)")
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!activeConversationId) {
      clearReply()
    }
  }, [activeConversationId, clearReply])

  // Закрываем мобильную навигацию при размонтировании/смене маршрута
  useEffect(() => {
    return () => closeMobileNav()
  }, [closeMobileNav])

  // Synchronous localStorage check before any API call
  useEffect(() => {
    if (!mounted || !isAuthenticated || initialized) return
    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem(USERNAME_CACHE_KEY)
      if (cached) {
        setUsernameState(true, cached)
      }
    }
    setInitialized(true)

    async function init() {
      setProfileLoading(true)
      await hydrateConversations()
      await hydratePending()

      const res = await fetch("/api/user-chat/profile")
      const json = await res.json()
      if (json.status === "success") {
        const hasUsername = !!json.data?.username
        setUsernameState(hasUsername, json.data?.username ?? null)
        if (hasUsername) {
          setNewUsername(json.data.username)
          if (typeof window !== "undefined") {
            window.localStorage.setItem(USERNAME_CACHE_KEY, json.data.username)
          }
        } else {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(USERNAME_CACHE_KEY)
          }
        }
      }
      setProfileLoading(false)

      if (useUserChatStore.getState().conversations.length === 0) {
        await fetchConversations()
      }
    }

    init()
  }, [mounted, isAuthenticated, initialized, setUsernameState])

  useEffect(() => {
    const convId = activeConversationId
    if (!convId || !isUsernameSet) return

    const id: string = convId
    async function initConv() {
      const existing = useUserChatStore.getState().messagesByConversation[id]
      if (!existing || existing.length === 0) {
        await hydrateMessages(id)
      }
      await deltaSync(id)
    }

    initConv()
  }, [activeConversationId, isUsernameSet])

  useEffect(() => {
    const convId = activeConversationId
    const currentUserId = authUser?.id
    if (!convId || !isUsernameSet || !username || !currentUserId) return

    userChatRealtime.connect(currentUserId, convId, {
      onMessage: (msg) => {
        const record = msg as unknown as MessageWithAttachments
        addMessage(convId, record)
        void fetchConversations()
      },
      onPresence: (userId, online) => {
        setPresence(userId, online)
      },
      onTyping: (typingConvId, userId, typingUsername, isTyping) => {
        if (isTyping) {
          setTyping(typingConvId, userId, typingUsername)
        } else {
          clearTyping(typingConvId, userId)
        }
      },
      onSubscribed: () => void deltaSync(convId),
    })

    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
      userChatRealtime.disconnect()
    }
  }, [
    activeConversationId,
    isUsernameSet,
    username,
    authUser?.id,
    addMessage,
    setPresence,
    setTyping,
    clearTyping,
  ])

  useEffect(() => {
    if (!activeConversationId || !isUsernameSet) return

    const sync = () => void deltaSync(activeConversationId)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") sync()
    }
    const interval = window.setInterval(sync, 15000)

    window.addEventListener("focus", sync)
    window.addEventListener("online", sync)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", sync)
      window.removeEventListener("online", sync)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [activeConversationId, isUsernameSet])

  const handleSaveUsername = useCallback(async () => {
    const name = newUsername.trim()
    if (name.length < 3 || name.length > 30) {
      setUsernameError("Username must be 3-30 characters")
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setUsernameError("Only letters, numbers, and underscores")
      return
    }

    setUsernameError(null)
    setSavingUsername(true)
    try {
      const res = await fetch("/api/user-chat/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      })
      const json = await res.json()
      if (json.status === "success") {
        setUsernameSaved(true)
        setTimeout(() => {
          setUsernameState(true, name)
          setNewUsername("")
        }, 600)
      } else {
        setUsernameError(json.error ?? "Failed to save username")
      }
    } catch {
      setUsernameError("Network error")
    } finally {
      setSavingUsername(false)
    }
  }, [newUsername, setUsernameState])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    setSearched(false)

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user-chat/users?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        if (json.status === "success" && Array.isArray(json.data)) {
          setSearchResults(json.data)
        }
      } catch {
        // silent
      } finally {
        setSearchLoading(false)
        setSearched(true)
      }
    }, 300)
  }, [])

  const handleStartConversation = useCallback(async (participantId: string, initialMsg?: string) => {
    try {
      const body: Record<string, unknown> = { participant_id: participantId }
      if (initialMsg) body.initial_message = initialMsg
      const res = await fetch("/api/user-chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.status === "success" && json.data) {
        setActiveConversation(json.data.id)
        setSearchQuery("")
        setSearchResults([])
        setSearched(false)
        await fetchConversations()
        if (json.data.id) {
          await deltaSync(json.data.id)
        }
      }
    } catch {
      // silent
    }
  }, [setActiveConversation])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || !activeConversationId) return
    setInput("")
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    userChatRealtime.sendTyping(username ?? "", false)
    const replyToMessageId = reply?.messageId ?? null
    clearReply()
    await sendMessage(activeConversationId, text, "text", replyToMessageId)
  }, [input, activeConversationId, username, clearReply, reply])

  const handleDelete = useCallback(async (messageId: string) => {
    if (!activeConversationId) return
    await deleteMessage(activeConversationId, messageId)
  }, [activeConversationId])

  const handleEditInline = useCallback(async (messageId: string, content: string) => {
    if (!activeConversationId || !content.trim()) return
    await editMessage(activeConversationId, messageId, content.trim())
  }, [activeConversationId])

  const handleCopyMessage = useCallback((messageId: string) => {
    const convId = activeConversationId
    if (!convId) return
    const msg = messagesByConversation[convId]?.find((m) => m.id === messageId)
    const text = msg?.content ?? ""
    if (!text) {
      toast.error("Нечего копировать", { position: "top-center" })
      return
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.success("Скопировано", { position: "top-center" }))
        .catch(() => toast.error("Не удалось скопировать", { position: "top-center" }))
    } else {
      toast.info("Скопировано", { position: "top-center" })
    }
  }, [activeConversationId, messagesByConversation])

  const handleReplyMessage = useCallback((messageId: string) => {
    const convId = activeConversationId
    if (!convId) return
    const msg = messagesByConversation[convId]?.find((m) => m.id === messageId)
    if (!msg) return
    const sender =
      msg.sender?.name ??
      msg.sender?.username ??
      (authUser?.id === msg.sender_id ? "вы" : "собеседник")
    const preview = (msg.content ?? "").slice(0, 120).replace(/\n/g, " ")
    setReply({
      messageId: msg.id,
      senderName: sender,
      preview,
    })
  }, [activeConversationId, messagesByConversation, authUser?.id, setReply])

  const handleForwardMessage = useCallback((messageId: string) => {
    const convId = activeConversationId
    if (!convId) return
    const msg = messagesByConversation[convId]?.find((m) => m.id === messageId)
    const text = msg?.content ?? ""
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() =>
          toast.success("Текст скопирован для пересылки", {
            position: "top-center",
          }),
        )
        .catch(() =>
          toast.error("Не удалось скопировать", { position: "top-center" }),
        )
    } else {
      toast.info("Текст скопирован для пересылки", { position: "top-center" })
    }
  }, [activeConversationId, messagesByConversation])

  const handleOpenProfile = useCallback((userId: string) => {
    if (!userId) return
    setProfileUserId(userId)
    setProfileData(null)
    setProfileFetchError(null)
    setProfileFetchLoading(true)

    void (async () => {
      try {
        const res = await fetch(`/api/user-chat/users/${encodeURIComponent(userId)}`)
        const json = await res.json()
        if (json.status === "success" && json.data) {
          setProfileData(json.data)
        } else if (res.status === 404) {
          setProfileFetchError("Пользователь не найден")
        } else {
          setProfileFetchError(json.error ?? "Не удалось загрузить профиль")
        }
      } catch {
        setProfileFetchError("Сетевая ошибка")
      } finally {
        setProfileFetchLoading(false)
      }
    })()
  }, [])

  const handleCloseProfile = useCallback(() => {
    setProfileUserId(null)
    setProfileData(null)
    setProfileFetchError(null)
  }, [])

  const handleProfileMessage = useCallback(
    (userId: string) => {
      handleCloseProfile()
      void handleStartConversation(userId)
    },
    [handleCloseProfile, handleStartConversation],
  )

  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] ?? [] : []
  const visibleMessages = activeMessages
    .filter((m) => !m.deleted_at)
    .filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const otherMember = activeConv?.other_member

  if (!mounted || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-text-secondary"
        >
          Доступно только после входа.
        </motion.p>
      </div>
    )
  }

  if (profileLoading && !isUsernameSet) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-muted">Загрузка профиля...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {!isUsernameSet ? (
          <UsernameGate
            profileLoading={profileLoading}
            username={newUsername}
            saving={savingUsername}
            saved={usernameSaved}
            error={usernameError}
            onChange={setNewUsername}
            onSave={handleSaveUsername}
            clearError={() => setUsernameError(null)}
          />
        ) : (
          <>
          <ChatLayout
            conversations={conversations}
            activeConversationId={activeConversationId}
            presenceState={presenceState}
            isLoading={isLoading}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            searched={searched}
            onSelectConversation={setActiveConversation}
            onSearch={handleSearch}
            onStartConversation={handleStartConversation}
            typingUsername={typingState[otherMember?.user_id ?? ""]?.username ?? ""}
            input={input}
            currentUserId={authUser?.id ?? null}
            onInputChange={setInput}
            onSend={handleSend}
            onEdit={handleEditInline}
            onDelete={handleDelete}
            onReply={handleReplyMessage}
            onCopy={handleCopyMessage}
            onForward={handleForwardMessage}
            onOpenProfile={handleOpenProfile}
            replyTo={reply}
            onCancelReply={clearReply}
            isMobile={isMobile}
            mobileNavOpen={mobileNavOpen}
            onOpenMobileNav={openMobileNav}
            onBackToList={openMobileNav}
            onSelectConversationMobile={(id) => {
              setActiveConversation(id)
              if (isMobile) closeMobileNav()
            }}
          />
          <UserProfilePanel
            userId={profileUserId}
            profile={profileData}
            loading={profileFetchLoading}
            error={profileFetchError}
            onClose={handleCloseProfile}
            onMessage={handleProfileMessage}
          />
          </>
        )}
      </div>
    </div>
  )
}

interface UsernameGateProps {
  profileLoading: boolean
  username: string
  saving: boolean
  saved: boolean
  error: string | null
  onChange: (value: string) => void
  onSave: () => void
  clearError: () => void
}

function UsernameGate({
  profileLoading,
  username,
  saving,
  saved,
  error,
  onChange,
  onSave,
  clearError,
}: UsernameGateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-1 items-center justify-center px-6"
    >
      <div className="max-w-md text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5"
        >
          {profileLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
          ) : (
            <UserCheck className="h-7 w-7 text-primary/40" />
          )}
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-base font-semibold text-foreground"
        >
          Добро пожаловать в чат
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary"
        >
          Создайте username, чтобы общаться с другими пользователями.
        </motion.p>

        {saved ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-8"
          >
            <motion.div
              animate={{ rotate: [0, 10, 0] }}
              transition={{ duration: 0.4 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
            >
              <Check className="h-8 w-8 text-green-600" />
            </motion.div>
            <p className="mt-3 text-sm font-medium text-green-600">Username сохранён</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mt-6 max-w-xs"
          >
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  onChange(e.target.value)
                  clearError()
                }}
                onKeyDown={(e) => e.key === "Enter" && !saving && onSave()}
                placeholder="Ваш username"
                disabled={saving}
                className="w-full rounded-xl border border-border bg-card-bg px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                maxLength={30}
              />
              {saving ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : null}
            </div>
            <AnimatePresence>
              {error ? (
                <motion.p
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="mt-1.5 flex items-center gap-1 text-xs text-error"
                >
                  <XCircle className="h-3 w-3" />
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSave}
              disabled={!username.trim() || saving}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Сохранить
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

interface ChatLayoutProps {
  conversations: ReturnType<typeof useUserChatStore.getState>["conversations"]
  activeConversationId: string | null
  presenceState: Record<string, boolean>
  isLoading: boolean
  searchQuery: string
  searchResults: UserProfile[]
  searchLoading: boolean
  searched: boolean
  onSelectConversation: (id: string) => void
  onSearch: (q: string) => void
  onStartConversation: (userId: string) => void
  typingUsername: string
  input: string
  currentUserId: string | null
  onInputChange: (value: string) => void
  onSend: () => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onReply: (messageId: string) => void
  onCopy: (messageId: string) => void
  onForward: (messageId: string) => void
  onOpenProfile: (userId: string) => void
  replyTo: ReplyTargetLike | null
  onCancelReply: () => void
  isMobile: boolean
  mobileNavOpen: boolean
  onOpenMobileNav: () => void
  onBackToList: () => void
  onSelectConversationMobile: (id: string) => void
}

function ChatLayout(props: ChatLayoutProps) {
  const {
    conversations,
    activeConversationId,
    presenceState,
    isLoading,
    searchQuery,
    searchResults,
    searchLoading,
    searched,
    onSelectConversation,
    onSearch,
    onStartConversation,
    typingUsername,
    input,
    currentUserId,
    onInputChange,
    onSend,
    onEdit,
    onDelete,
    onReply,
    onCopy,
    onForward,
    onOpenProfile,
    replyTo,
    onCancelReply,
    isMobile,
    mobileNavOpen,
    onOpenMobileNav,
    onBackToList,
    onSelectConversationMobile,
  } = props

  const messagesByConversation = useUserChatStore((s) => s.messagesByConversation)
  const pendingMessages = useUserChatStore((s) => s.pendingMessages)
  const typingState = useUserChatStore((s) => s.typingState)

  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId] ?? []
    : []
  const visibleMessages = activeMessages
    .filter((m) => !m.deleted_at)
    .filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const otherMember = activeConv?.other_member
  const isOnline = !!otherMember && !!presenceState[otherMember.user_id]
  const otherTyping = otherMember ? typingState[otherMember.user_id] ?? null : null

  const isMobileSidebarVisible = isMobile && (mobileNavOpen || !activeConversationId)
  const isMobileChatVisible = isMobile && !!activeConversationId && !mobileNavOpen

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <motion.aside
        initial={false}
        animate={
          isMobile
            ? { x: isMobileSidebarVisible ? "0%" : "-100%" }
            : { x: 0 }
        }
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`shrink-0 border-r border-border bg-card-bg md:relative md:flex md:w-80 md:translate-x-0 md:flex-col ${
          isMobile ? "absolute inset-y-0 left-0 z-20 flex w-full" : ""
        } ${
          isMobile && !isMobileSidebarVisible ? "pointer-events-none" : ""
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          presenceState={presenceState}
          isLoading={isLoading}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searchLoading={searchLoading}
          searched={searched}
          onSelectConversation={(id) => {
            onSelectConversationMobile(id)
          }}
          onSearch={onSearch}
          onStartConversation={onStartConversation}
        />
      </motion.aside>

      <motion.main
        initial={false}
        animate={
          isMobile
            ? { x: isMobileChatVisible ? "0%" : "100%" }
            : { x: 0 }
        }
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`flex min-w-0 flex-1 flex-col ${
          isMobile && !isMobileChatVisible ? "pointer-events-none" : ""
        }`}
      >
        {activeConversationId && otherMember ? (
          <ChatHeader
            displayName={otherMember.name ?? otherMember.username ?? null}
            username={otherMember.username ?? null}
            isOnline={isOnline}
            isTyping={otherTyping}
            lastSeenAt={null}
            onOpenProfile={() => onOpenProfile(otherMember.user_id)}
            onOpenSearch={() => {
              toast.info("Поиск по сообщениям скоро будет доступен", {
                description: "Функция появится в следующих обновлениях",
                position: "top-center",
              })
            }}
          />
        ) : null}
        <ChatPanel
          activeConversationId={activeConversationId}
          messages={visibleMessages}
          pendingMessages={pendingMessages}
          currentUserId={currentUserId}
          input={input}
          typingUsername={typingUsername}
          onInputChange={onInputChange}
          onSend={onSend}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={onReply}
          onCopy={onCopy}
          onForward={onForward}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
          isMobile={isMobile}
          recipientLastReadMessageId={
            activeConv?.other_member_last_read_message_id ?? null
          }
          recipientName={otherMember?.name ?? otherMember?.username ?? null}
        />
      </motion.main>
    </div>
  )
}
