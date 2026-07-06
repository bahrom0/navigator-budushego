"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, MessageSquarePlus, X } from "lucide-react"

interface UserProfileData {
  user_id: string
  username: string | null
  name: string | null
  bio: string | null
  avatar_url: string | null
  level: string
  last_seen_at: string | null
  community_context?: {
    goal_id: string | null
    nct_code: string | null
    nct_title: string | null
    university: string | null
    city: string | null
    current_week_number: number | null
  } | null
}

interface UserProfilePanelProps {
  userId: string | null
  profile: UserProfileData | null
  loading: boolean
  error: string | null
  onClose: () => void
  onMessage: (userId: string) => void
}

function initials(value: string | null | undefined): string {
  return ((value ?? "").charAt(0) || "?").toUpperCase()
}

function formatLastSeen(iso: string | null, isOnline: boolean): string {
  if (isOnline) return "В сети"
  if (!iso) return "Был(а) недавно"
  const date = new Date(iso)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return "Был(а) недавно"
  if (diffMin < 60) return `Был(а) ${diffMin} мин назад`
  const sameDay = new Date().toDateString() === date.toDateString()
  if (sameDay) {
    const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    return `Был(а) сегодня в ${time}`
  }
  return `Был(а) ${date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`
}

export function UserProfilePanel({
  userId,
  profile,
  loading,
  error,
  onClose,
  onMessage,
}: UserProfilePanelProps) {
  useEffect(() => {
    if (!userId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [userId, onClose])

  const displayName = profile?.name ?? profile?.username ?? "Пользователь"
  const open = !!userId

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="user-profile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Профиль пользователя"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            key="user-profile-card"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-card-bg shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть профиль"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <X className="h-4 w-4" />
            </button>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="text-sm text-text-secondary">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Закрыть
                </button>
              </div>
            ) : profile ? (
              <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {initials(displayName)}
                  </div>
                )}
                <h2 className="mt-4 truncate text-[18px] font-semibold text-foreground">
                  {displayName}
                </h2>
                {profile.username ? (
                  <p className="mt-1 truncate text-[14px] font-medium text-text-secondary">
                    @{profile.username}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-2 text-[12px] text-text-muted">
                  <span className="rounded-full border border-border px-2 py-0.5 font-medium uppercase tracking-wide">
                    {profile.level}
                  </span>
                  <span>{formatLastSeen(profile.last_seen_at, false)}</span>
                </div>

                {profile.community_context ? (
                  <div className="mt-4 flex w-full flex-wrap gap-2 text-left">
                    {profile.community_context.nct_code ? (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-text-secondary">
                        {profile.community_context.nct_code}
                      </span>
                    ) : null}
                    {profile.community_context.university ? (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-text-secondary">
                        {profile.community_context.university}
                      </span>
                    ) : null}
                    {profile.community_context.city ? (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-text-secondary">
                        {profile.community_context.city}
                      </span>
                    ) : null}
                    {typeof profile.community_context.current_week_number === "number" ? (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-text-secondary">
                        Week {profile.community_context.current_week_number}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {profile.bio ? (
                  <p className="mt-4 w-full whitespace-pre-wrap text-left text-[14px] leading-relaxed text-text-secondary">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-4 text-[13px] italic text-text-muted">
                    Пользователь пока не добавил bio
                  </p>
                )}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onMessage(profile.user_id)}
                  className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Написать сообщение
                </motion.button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
