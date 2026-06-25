"use client"

import { Check, CheckCheck, Loader2, XCircle } from "lucide-react"
import { motion } from "framer-motion"
import type { DeliveryStatus } from "./grouping"
import type { ReplyPreview } from "./types-ui"
export type { ReplyPreview }

interface BubbleProps {
  own: boolean
  content: string | null
  time: string
  edited: boolean
  deleted: boolean
  showAvatar?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  replyTo?: ReplyPreview | null
  replyToId?: string | null
  onReplyClick?: (replyToMessageId: string) => void
  delivery?: DeliveryStatus | null
  senderName?: string | null
}

function avatarInitial(value: string | null | undefined): string {
  return ((value ?? "").charAt(0) || "?").toUpperCase()
}

export function MessageBubble({
  own,
  content,
  time,
  edited,
  deleted,
  showAvatar: _showAvatar,
  isFirstInGroup = true,
  isLastInGroup = true,
  replyTo = null,
  replyToId = null,
  onReplyClick,
  delivery = null,
  senderName = null,
}: BubbleProps) {
  if (deleted) {
    return (
      <div
        className={`inline-block max-w-full rounded-2xl border border-dashed border-border px-4 py-2 text-xs italic text-text-muted ${
          own ? "bg-border/20" : "bg-border/30"
        }`}
      >
        Сообщение удалено
        <span className="ml-2 text-[10px] text-text-muted/70">{time}</span>
      </div>
    )
  }
  return (
    <div
      className={`inline-block max-w-full rounded-2xl px-3.5 py-2 select-none ${
        own ? "bg-primary text-white" : "bg-border/40 text-foreground"
      } ${isFirstInGroup ? "rounded-tr-md" : "rounded-tr-2xl"} ${
        isLastInGroup ? "rounded-br-md" : "rounded-br-2xl"
      }`}
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    >
      {!own && senderName && isFirstInGroup ? (
        <p className="mb-0.5 text-[11px] font-semibold text-primary/80">
          {senderName}
        </p>
      ) : null}
      {replyTo ? (
        <div className="mb-1.5">
          <ReplyChip
            preview={replyTo}
            own={own}
            replyToId={replyToId}
            onClick={onReplyClick}
          />
        </div>
      ) : null}
      <p
        className="whitespace-pre-wrap text-[15px] leading-relaxed select-none"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        {content}
      </p>
      <div
        className={`mt-1 flex items-center justify-end gap-1.5 ${
          own ? "text-white/80" : "text-text-muted"
        }`}
      >
        {edited ? (
          <span className="text-[9px] uppercase tracking-wide opacity-70">
            ред.
          </span>
        ) : null}
        <span className="text-[10px]">{time}</span>
        {own ? <DeliveryIcon status={delivery} /> : null}
      </div>
    </div>
  )
}

function ReplyChip({
  preview,
  own,
  replyToId,
  onClick,
}: {
  preview: ReplyPreview
  own: boolean
  replyToId: string | null
  onClick?: (replyToMessageId: string) => void
}) {
  const clickable = !!onClick && !!replyToId && !preview.deleted
  const inner = (
    <>
      <span
        aria-hidden
        className={own ? "w-[2px] shrink-0 bg-white/70" : "w-[2px] shrink-0 bg-primary"}
      />
      <div className="min-w-0 flex-1 px-2 py-1">
        <p
          className={`truncate text-[12px] font-medium leading-none ${
            own ? "text-white" : "text-primary"
          }`}
        >
          {preview.senderName ?? "Сообщение"}
        </p>
        <p
          className={`mt-1 truncate text-[13px] leading-snug ${
            own ? "text-white/85" : "text-text-secondary"
          }`}
        >
          {preview.deleted
            ? "Сообщение удалено"
            : preview.text ?? "(медиа)"}
        </p>
      </div>
    </>
  )
  const baseClass = `flex items-stretch gap-0 overflow-hidden rounded-[10px] ${
    own ? "bg-white/10" : "bg-border/40"
  } ${clickable ? "transition-colors hover:bg-border/60 cursor-pointer" : ""}`
  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(replyToId as string)}
        className={baseClass}
        aria-label="Перейти к сообщению"
      >
        {inner}
      </button>
    )
  }
  return <div className={baseClass}>{inner}</div>
}

function DeliveryIcon({ status }: { status: DeliveryStatus | null }) {
  if (!status) return null
  if (status === "sent") {
    return <Check className="h-3 w-3 opacity-60" aria-label="Отправлено" />
  }
  if (status === "delivered") {
    return (
      <CheckCheck className="h-3 w-3 opacity-60" aria-label="Доставлено" />
    )
  }
  return (
    <CheckCheck className="h-3 w-3 text-[#93C5FD]" aria-label="Прочитано" />
  )
}

interface PendingBubbleProps {
  content: string
  status: "sending" | "sent" | "failed"
}

export function PendingBubble({ content, status }: PendingBubbleProps) {
  return (
    <div
      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
        status === "failed"
          ? "border border-error/30 bg-error/5"
          : "bg-primary/60 text-white"
      }`}
    >
      <p className="text-sm leading-relaxed">{content}</p>
      <div
        className={`mt-1 flex items-center justify-end gap-1.5 ${
          status === "failed" ? "" : "text-white/70"
        }`}
      >
        {status === "sending" ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[10px]">Отправка…</span>
          </>
        ) : status === "failed" ? (
          <>
            <XCircle className="h-3 w-3 text-error" />
            <span className="text-[10px] text-error">Ошибка</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

interface TypingBubbleProps {
  visible: boolean
}

export function TypingBubble({ visible }: TypingBubbleProps) {
  if (!visible) return null
  return (
    <div className="flex justify-start py-1">
      <div className="flex items-center gap-1.5 rounded-2xl bg-border/40 px-3 py-2 text-[11px] text-text-muted">
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
          className="h-1 w-1 rounded-full bg-text-muted"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }}
          className="h-1 w-1 rounded-full bg-text-muted"
        />
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 }}
          className="h-1 w-1 rounded-full bg-text-muted"
        />
        печатает…
      </div>
    </div>
  )
}

interface SystemMessageProps {
  text: string
}

export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full bg-border/40 px-3 py-1 text-[11px] font-medium text-text-muted">
        {text}
      </span>
    </div>
  )
}

interface ReplyAvatarProps {
  name: string | null
}

export function ReplyAvatar({ name }: ReplyAvatarProps) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {avatarInitial(name)}
    </div>
  )
}
