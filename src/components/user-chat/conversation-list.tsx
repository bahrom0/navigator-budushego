"use client"

import {
  Loader2,
  MessageCircle,
  Search,
  Users,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import type { ConversationListProps } from "./types-ui"

function formatConversationTime(ts: string | null | undefined): string {
  if (!ts) return ""
  const date = new Date(ts)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  })
}

function avatarInitial(value: string | null | undefined): string {
  const safe = (value ?? "").trim()
  return (safe.charAt(0) || "?").toUpperCase()
}

export function ConversationList({
  conversations,
  activeConversationId,
  presenceState,
  isLoading,
  communityTitle,
  communityDescription,
  communityFilters = [],
  activeCommunityFilter = null,
  searchQuery,
  searchResults,
  searchLoading,
  searched,
  resultsLabel,
  onSelectConversation,
  onSearch,
  onToggleCommunityFilter,
  onStartConversation,
}: ConversationListProps) {
  const showDiscoveryResults =
    searchQuery.trim().length >= 2 ||
    (!!activeCommunityFilter && (searched || searchLoading || searchResults.length > 0))

  return (
    <div className="flex h-full w-full flex-col">
      <div className="shrink-0 border-b border-border bg-card-bg/72 px-3 py-3 backdrop-blur">
        {communityTitle ? (
          <div className="mb-3">
            <span className="navigator-kicker navigator-kicker--muted">Сообщество</span>
            <p className="mt-3 text-sm font-semibold text-foreground">{communityTitle}</p>
            {communityDescription ? (
              <p className="mt-1 text-xs leading-5 text-text-secondary">{communityDescription}</p>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Поиск по людям, коду или goal"
            className="w-full rounded-xl border border-border bg-background/80 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchLoading ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          ) : null}
        </div>

        {communityFilters.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {communityFilters.map((filter) => {
              const active = activeCommunityFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onToggleCommunityFilter?.(filter.id)}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-background text-text-secondary hover:bg-card-bg hover:text-foreground"
                  }`}
                  title={filter.helper}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            <p className="text-xs text-text-muted">Загрузка...</p>
          </div>
        ) : showDiscoveryResults ? (
          <SearchResults
            loading={searchLoading}
            searched={searched}
            results={searchResults}
            label={resultsLabel ?? searchQuery}
            onStart={onStartConversation}
          />
        ) : conversations.length === 0 ? (
          <EmptyState />
        ) : (
          <Conversations
            conversations={conversations}
            activeId={activeConversationId}
            presence={presenceState}
            onSelect={onSelectConversation}
          />
        )}
      </div>
    </div>
  )
}

interface ConversationsProps {
  conversations: ConversationListProps["conversations"]
  activeId: string | null
  presence: Record<string, boolean>
  onSelect: (id: string) => void
}

function Conversations({ conversations, activeId, presence, onSelect }: ConversationsProps) {
  return (
    <div className="space-y-0.5">
      <AnimatePresence initial={false}>
        {conversations.map((conv) => {
          const member = conv.other_member
          const displayName = member?.name ?? member?.username ?? "Пользователь"
          const username = member?.username ?? null
          const lastMessage = conv.last_message?.content ?? null
          const lastMessageAt = conv.last_message_at ?? null
          const isActive = conv.id === activeId
          const isOnline = member ? !!presence[member.user_id] : false
          const unread = conv.unread_count ?? 0

          return (
            <motion.button
              key={conv.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onSelect(conv.id)}
              aria-current={isActive ? "true" : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                isActive
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "hover:bg-border/40"
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="conversation-active-indicator"
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                />
              ) : null}

              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {avatarInitial(displayName)}
                </div>
                {isOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card-bg bg-success" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`truncate text-sm ${
                      unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
                    }`}
                  >
                    {displayName}
                  </span>
                  {username ? (
                    <span className="truncate text-[11px] text-text-muted">
                      @{username}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <p
                    className={`truncate text-xs ${
                      unread > 0 ? "text-foreground/80" : "text-text-muted"
                    }`}
                  >
                    {lastMessage ?? "Нет сообщений"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] text-text-muted">
                  {formatConversationTime(lastMessageAt)}
                </span>
                {unread > 0 ? (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white"
                  >
                    {unread > 99 ? "99+" : unread}
                  </motion.span>
                ) : null}
              </div>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

interface SearchResultsProps {
  loading: boolean
  searched: boolean
  results: ConversationListProps["searchResults"]
  label: string | null
  onStart: (userId: string) => void
}

function SearchResults({ loading, searched, results, label, onStart }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-1 px-1 py-2">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 0.8, repeatType: "reverse" }}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2"
          >
            <div className="h-9 w-9 rounded-full bg-border" />
            <div className="h-3 flex-1 rounded bg-border" />
          </motion.div>
        ))}
      </div>
    )
  }

  if (results.length === 0 && searched) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-2 px-3 py-10 text-center"
      >
        <Users className="h-8 w-8 text-text-muted/40" />
        <p className="text-xs text-text-muted">Подходящие люди не найдены</p>
      </motion.div>
    )
  }

  if (results.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-text-muted">
        {label ?? "Community"}
      </p>
    )
  }

  return (
    <div className="space-y-0.5 px-1 py-1">
      <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-text-muted">
        {loading ? "Поиск..." : label ?? "Подходящие люди"}
      </p>
      <motion.div layout className="space-y-0.5">
        {results.map((user, idx) => (
          <motion.button
            key={user.user_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onStart(user.user_id)}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-border/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {avatarInitial(user.name ?? user.username)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name ?? user.username ?? "Пользователь"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                {user.username ? <span>@{user.username}</span> : null}
                {user.community_context?.nct_code ? (
                  <span>{user.community_context.nct_code}</span>
                ) : null}
                {typeof user.community_context?.current_week_number === "number" ? (
                  <span>Week {user.community_context.current_week_number}</span>
                ) : null}
              </div>
              {user.match_reasons && user.match_reasons.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.match_reasons.slice(0, 2).map((reason) => (
                    <span
                      key={`${user.user_id}-${reason}`}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-text-secondary"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-2 px-3 py-10 text-center"
    >
      <MessageCircle className="h-8 w-8 text-text-muted/40" />
      <p className="text-sm font-medium text-foreground">Пока нет диалогов</p>
      <p className="max-w-[220px] text-xs text-text-muted">
        Начните с goal-контекста или найдите человека по username, чтобы открыть личный диалог.
      </p>
    </motion.div>
  )
}
