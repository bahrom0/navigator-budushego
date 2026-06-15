"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { SendHorizonal } from "lucide-react"
import { ReplyPreview } from "./reply-preview"
import type { ReplyTarget } from "@/lib/user-chat/reply-store"

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  replyTo?: ReplyTarget | null
  onCancelReply?: () => void
  disabled?: boolean
}

const MIN_HEIGHT = 24
const MAX_HEIGHT = 160

export function ChatComposer({
  value,
  onChange,
  onSend,
  replyTo = null,
  onCancelReply,
  disabled = false,
}: ComposerProps) {
  const hasReply = replyTo !== null
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isSending, setIsSending] = useState(false)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = `${MIN_HEIGHT}px`
    const next = Math.min(el.scrollHeight, MAX_HEIGHT)
    el.style.height = `${next}px`
  }, [value])

  useEffect(() => {
    if (!hasReply) return
    textareaRef.current?.focus()
  }, [hasReply])

  const handleSend = () => {
    if (!value.trim() || isSending || disabled) return
    setIsSending(true)
    try {
      onSend()
    } finally {
      window.setTimeout(() => setIsSending(false), 250)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="shrink-0 border-t border-border bg-card-bg px-4 py-3"
    >
      <div className="mx-auto max-w-[720px]">
        <AnimatePresence initial={false}>
          {hasReply ? (
            <motion.div
              key="reply"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 4 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <ReplyPreview reply={replyTo} onCancel={() => onCancelReply?.()} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 transition-colors focus-within:border-primary/40">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              } else if (e.key === "Escape" && hasReply) {
                e.preventDefault()
                onCancelReply?.()
              }
            }}
            placeholder={hasReply ? "Введите ответ..." : "Напишите сообщение..."}
            disabled={disabled}
            rows={1}
            aria-label="Сообщение"
            className="block w-full flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-foreground placeholder:text-text-muted focus:outline-none disabled:opacity-50"
            style={{
              minHeight: `${MIN_HEIGHT}px`,
              maxHeight: `${MAX_HEIGHT}px`,
            }}
          />
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || isSending}
            aria-label="Отправить сообщение"
            whileHover={{ scale: value.trim() ? 1.05 : 1 }}
            whileTap={{ scale: value.trim() ? 0.92 : 1 }}
            animate={{
              scale: isSending ? 0.85 : 1,
              rotate: isSending ? -25 : 0,
            }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
          >
            <SendHorizonal className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
