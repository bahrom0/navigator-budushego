"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  Sparkles,
  Loader2,
  RotateCcw,
  Trash2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import type { ReactNode } from "react"
import type { TeacherMessage } from "@/types/teacher"

interface ChatMessagesProps {
  messages: TeacherMessage[]
  isLoading: boolean
  error: string | null
  streamingId: string | null
  onRegenerate: (messageId: string) => void
  renderAfterMessage?: (messageId: string) => React.ReactNode
  emptyState?: ReactNode
  loadingText?: string
}

function StreamingContent({ content }: { content: string }) {
  const [displayedWords, setDisplayedWords] = useState(0)
  const [done, setDone] = useState(false)
  const words = content.split(" ")
  const displayRef = useRef<number>(0)

  useEffect(() => {
    displayRef.current = 0
    setDisplayedWords(0) // eslint-disable-line react-hooks/set-state-in-effect
    setDone(false) // eslint-disable-line react-hooks/set-state-in-effect
    if (!content) return

    const batchSize = Math.max(1, Math.floor(words.length / 18))
    const interval = 30

    const timer = setInterval(() => {
      displayRef.current += batchSize
      if (displayRef.current >= words.length) {
        setDisplayedWords(words.length)
        setDone(true)
        clearInterval(timer)
      } else {
        setDisplayedWords(displayRef.current)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [content])

  if (done) return <>{content}</>

  if (displayedWords === 0) return null

  return (
    <span>
      {words.slice(0, displayedWords).join(" ")}
      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary" />
    </span>
  )
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

function renderMarkdownContent(content: string): ReactNode {
  const lines = content.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    blocks.push(
      <ul key={`list-${blocks.length}`} className="ml-5 list-disc space-y-1">
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()

    if (!line) {
      flushList()
      return
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2).trim())
      return
    }

    flushList()

    if (line.startsWith("### ")) {
      blocks.push(<h4 key={`h3-${index}`} className="mt-3 text-base font-semibold">{renderInlineMarkdown(line.slice(4))}</h4>)
      return
    }

    if (line.startsWith("## ")) {
      blocks.push(<h3 key={`h2-${index}`} className="mt-3 text-lg font-semibold">{renderInlineMarkdown(line.slice(3))}</h3>)
      return
    }

    if (line.startsWith("# ")) {
      blocks.push(<h2 key={`h1-${index}`} className="mt-3 text-xl font-semibold">{renderInlineMarkdown(line.slice(2))}</h2>)
      return
    }

    blocks.push(
      <p key={`p-${index}`} className="whitespace-pre-wrap">
        {renderInlineMarkdown(rawLine)}
      </p>,
    )
  })

  flushList()
  return <div className="space-y-2">{blocks}</div>
}

function MessageItem({
  message,
  isStreaming,
  onRegenerate,
  onDelete,
}: {
  message: TeacherMessage
  isStreaming: boolean
  onRegenerate: (messageId: string) => void
  onDelete: (messageId: string) => void
}) {
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null)
  const isUser = message.role === "user"
  const time = new Date(message.timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex w-full max-w-[720px] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isUser && (
          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/5">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
        )}

        <div className={`min-w-0 flex-1 ${isUser ? "text-right" : "text-left"}`}>
          <div className="text-[15px] leading-relaxed text-foreground">
            {isStreaming ? (
              <StreamingContent content={message.content} />
            ) : (
              renderMarkdownContent(message.content)
            )}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">{time}</p>
          {!isUser && !isStreaming && (
            <div className="mt-2 flex items-center gap-1" aria-label="Действия с ответом">
              <ActionButton
                label="Повторить генерацию"
                onClick={() => onRegenerate(message.id)}
              >
                <RotateCcw className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                label="Удалить ответ"
                onClick={() => onDelete(message.id)}
                danger
              >
                <Trash2 className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                label="Нравится"
                active={feedback === "like"}
                onClick={() => setFeedback(feedback === "like" ? null : "like")}
              >
                <ThumbsUp className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                label="Не нравится"
                active={feedback === "dislike"}
                onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
              >
                <ThumbsDown className="h-4 w-4" />
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({
  label,
  active = false,
  danger = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        active
          ? "bg-primary-light text-primary"
          : danger
            ? "text-text-muted hover:bg-error/5 hover:text-error"
            : "text-text-muted hover:bg-border/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

export function ChatMessages({
  messages,
  isLoading,
  error,
  streamingId,
  onRegenerate,
  renderAfterMessage,
  emptyState,
  loadingText = "Помощник думает...",
}: ChatMessagesProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const visibleMessages = messages.filter((message) => !deletedIds.includes(message.id))

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      })
    }
  }, [messages, isLoading])

  return (
    <div
      ref={listRef}
      className={
        visibleMessages.length === 0 && !isLoading
          ? "shrink-0"
          : "chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
      }
    >
      <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-8 sm:px-10 lg:px-14">
        {visibleMessages.length === 0 && !isLoading && !error && (
          emptyState ?? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <Sparkles className="h-7 w-7 text-primary/40" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Начните разговор
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
                Спросите о непонятной теме, термине или шаге подготовки.
              </p>
            </motion.div>
          )
        )}

        <AnimatePresence initial={false}>
          {visibleMessages.map((msg) => (
            <div key={msg.id}>
              <div className="py-2">
                <MessageItem
                  message={msg}
                  isStreaming={streamingId === msg.id}
                  onRegenerate={onRegenerate}
                  onDelete={(id) => setDeletedIds((current) => [...current, id])}
                />
              </div>
              {renderAfterMessage?.(msg.id) && (
                <div className="pb-2">
                  {renderAfterMessage(msg.id)}
                </div>
              )}
            </div>
          ))}
        </AnimatePresence>

        {isLoading && !streamingId && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 py-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
              <span className="text-xs text-text-muted">{loadingText}</span>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 rounded-lg border border-error/20 bg-error/5 px-4 py-3"
          >
            <p className="text-sm text-error">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
