"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, MoreVertical, Search, User } from "lucide-react"
import type { ChatHeaderProps } from "./types-ui"
import { HeaderActionsMenu } from "./header-actions-menu"

function avatarInitial(value: string | null | undefined): string {
  return ((value ?? "").charAt(0) || "?").toUpperCase()
}

function formatLastSeen(iso: string | null, isOnline: boolean): string {
  if (isOnline) return ""
  if (!iso) return "Был(а) недавно"
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Был(а) недавно"
  if (diffMin < 60) return `Был(а) ${diffMin} мин назад`
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    const time = date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
    return `Был(а) сегодня в ${time}`
  }
  return `Был(а) ${date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  })}`
}

export function ChatHeader({
  displayName,
  username,
  isOnline,
  isTyping,
  lastSeenAt,
  onOpenProfile,
  onOpenSearch,
  onOpenMenu,
  onBack,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuAnchorRef = useRef<HTMLButtonElement>(null)
  const name = (displayName ?? username ?? "Пользователь").trim() || "Пользователь"

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (
        menuAnchorRef.current &&
        !menuAnchorRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [menuOpen])

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      if (!prev) onOpenMenu?.()
      return !prev
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card-bg px-4"
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад к списку чатов"
          className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Открыть профиль пользователя"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {avatarInitial(name)}
        </div>
        {isOnline ? (
          <span
            aria-label="В сети"
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card-bg bg-success"
          />
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-[18px] font-semibold leading-tight text-foreground">
            {name}
          </p>
          {username ? (
            <p className="truncate text-[13px] font-medium leading-tight text-text-muted">
              @{username}
            </p>
          ) : null}
        </div>
        <div className="mt-0.5 h-4 text-[11px] leading-tight">
          <AnimatePresence mode="wait" initial={false}>
            {isTyping ? (
              <motion.span
                key="typing"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-primary"
              >
                <TypingDots />
                {isTyping.username} печатает…
              </motion.span>
            ) : isOnline ? (
              <motion.span
                key="online"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-success"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                В сети
              </motion.span>
            ) : (
              <motion.span
                key="offline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-text-muted"
              >
                {formatLastSeen(lastSeenAt, false)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Поиск по сообщениям"
          title="Поиск по сообщениям"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Открыть профиль"
          title="Открыть профиль"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <User className="h-4 w-4" />
        </button>
        <div className="relative">
          <button
            ref={menuAnchorRef}
            type="button"
            onClick={toggleMenu}
            aria-label="Дополнительные действия"
            aria-expanded={menuOpen}
            title="Дополнительные действия"
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
              menuOpen
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-border/40 hover:text-foreground"
            }`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {menuOpen ? (
              <HeaderActionsMenu
                onClose={() => setMenuOpen(false)}
                onMute={() => {
                  setMenuOpen(false)
                  onOpenMenu?.()
                }}
                onClear={() => {
                  setMenuOpen(false)
                  onOpenMenu?.()
                }}
                onBlock={() => {
                  setMenuOpen(false)
                  onOpenMenu?.()
                }}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
        className="h-1 w-1 rounded-full bg-primary"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }}
        className="h-1 w-1 rounded-full bg-primary"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 }}
        className="h-1 w-1 rounded-full bg-primary"
      />
    </span>
  )
}
