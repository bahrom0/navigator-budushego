"use client"

import { useRef, useCallback } from "react"
import { ArrowUp } from "lucide-react"

interface ChatComposerProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  isLoading,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="navigator-surface flex items-end gap-2 rounded-2xl px-3 py-2 shadow-sm">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={typeof input === "string" ? input : ""}
            onChange={(e) => {
              const value = typeof e.target.value === "string" ? e.target.value : String(e.target.value)
              onInputChange(value)
              requestAnimationFrame(adjustHeight)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Спроси наставника..."
            disabled={isLoading}
            rows={1}
            className="w-full resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none disabled:opacity-50"
            style={{ maxHeight: "128px" }}
            aria-label="Сообщение наставнику"
          />
        </div>

        <button
          onClick={() => onSend()}
          disabled={!input || typeof input !== "string" || !input.trim() || isLoading}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
          aria-label="Отправить"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
