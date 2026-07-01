"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import type { ReplyTarget } from "@/lib/user-chat/reply-store"

interface ReplyPreviewProps {
  reply: ReplyTarget | null
  onCancel: () => void
  own?: boolean
}

export function ReplyPreview({ reply, onCancel, own = false }: ReplyPreviewProps) {
  if (!reply) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`flex items-stretch gap-0 overflow-hidden rounded-xl border ${
        own
          ? "border-white/20 bg-white/10"
          : "border-border bg-card-bg"
      }`}
    >
      <span
        aria-hidden
        className={own ? "w-[2px] shrink-0 bg-white/70" : "w-[2px] shrink-0 bg-primary"}
      />
      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <p
          className={`truncate text-[12px] font-medium leading-none ${
            own ? "text-white" : "text-primary"
          }`}
        >
          {reply.senderName}
        </p>
        <p
          className={`mt-1 truncate text-[13px] leading-snug ${
            own ? "text-white/85" : "text-text-secondary"
          }`}
        >
          {reply.preview || "(медиа)"}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Отменить ответ"
        className={`flex w-7 shrink-0 items-center justify-center transition-colors ${
          own
            ? "text-white/70 hover:bg-white/15 hover:text-white"
            : "text-text-muted hover:bg-border/60 hover:text-foreground"
        }`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}
