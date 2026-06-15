"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Paperclip,
  ArrowUp,
  ChevronDown,
  Headphones,
  Image,
  Video,
  FileText,
  ImagePlus,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import type { ChatModel, AttachmentType } from "@/types/chat"

const MODELS: ChatModel[] = [
  { id: "facts", title: "Факты", description: "Точные ответы на основе данных" },
  { id: "creative", title: "Креативность", description: "Творческий и нестандартный подход" },
  { id: "emotional", title: "Эмоциональный", description: "Эмпатичное и поддерживающее общение" },
  { id: "analytical", title: "Аналитический", description: "Глубокий анализ и расклады" },
  { id: "quick", title: "Быстрый режим", description: "Краткие и быстрые ответы" },
  { id: "researcher", title: "Исследователь", description: "Поиск и изучение нового" },
]

const ATTACH_ITEMS: { type: AttachmentType; label: string; icon: typeof Paperclip }[] = [
  { type: "audio", label: "Audio", icon: Headphones },
  { type: "image", label: "Image", icon: Image },
  { type: "video", label: "Video", icon: Video },
  { type: "document", label: "Document", icon: FileText },
  { type: "google-photos", label: "Google Photos", icon: ImagePlus },
]

interface ChatComposerProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  selectedModel: string
  onModelChange: (id: string) => void
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  isLoading,
  selectedModel,
  onModelChange,
}: ChatComposerProps) {
  const [modelOpen, setModelOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeModel = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0]
  const prevModelRef = useRef(selectedModel)

  useEffect(() => {
    if (prevModelRef.current !== selectedModel) {
      prevModelRef.current = selectedModel
      const model = MODELS.find((m) => m.id === selectedModel)
      if (model) {
        toast("Модель изменена", {
          description: model.title,
          duration: 1500,
          position: "top-center",
        })
      }
    }
  }, [selectedModel])

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
{/* Model selector */}
  <div className="relative mb-1 flex items-center justify-center">
  <button
    onClick={() => setModelOpen(!modelOpen)}
    className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] leading-none text-text-secondary transition-colors hover:bg-border/30 hover:text-foreground"
    aria-expanded={modelOpen}
    aria-label="Выбрать модель"
  >
    <motion.span layoutId="model-label" transition={{ type: "spring", stiffness: 300, damping: 25 }}>
    {activeModel.title}
    </motion.span>
    <ChevronDown
      className={`h-2.5 w-2.5 transition-transform duration-150 ${modelOpen ? "rotate-180" : ""}`}
    />
  </button>

  <AnimatePresence>
  {modelOpen && (
  <motion.div
    initial={{ opacity: 0, y: -4, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -4, scale: 0.96 }}
    transition={{ duration: 0.12 }}
    className="chat-scrollbar absolute bottom-full z-20 mb-1 max-h-[min(50dvh,18rem)] w-[min(16rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card-bg/95 shadow-lg backdrop-blur"
  >
    <div className="py-1">
    {MODELS.map((model) => {
    const isActive = model.id === selectedModel
    return (
    <motion.button
      key={model.id}
      onClick={() => {
      onModelChange(model.id)
      setModelOpen(false)
      }}
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.12 }}
      className={`flex min-h-[2.5rem] w-full items-center gap-2 px-3 py-1.5 text-left text-sm leading-snug transition-colors ${
      isActive
      ? "bg-primary/5 text-foreground"
      : "text-text-secondary hover:bg-border/30 hover:text-foreground"
      }`}
    >
    <div className="flex-1">
    <p className="text-xs font-medium">{model.title}</p>
    <p className="text-[10px] leading-tight text-text-muted">
    {model.description}
    </p>
    </div>
    {isActive && (
    <Check className="h-3 w-3 text-primary" />
    )}
    </motion.button>
    )
    })}
    </div>
  </motion.div>
  )}
  </AnimatePresence>
  </div>

      {/* Composer pill */}
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-card-bg px-3 py-2 shadow-sm">
        {/* Attachments */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setAttachOpen(!attachOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-border/30 hover:text-foreground"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {attachOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full left-0 mb-2 z-20 w-44 rounded-xl border border-border bg-card-bg/95 py-1 shadow-lg backdrop-blur"
              >
                {ATTACH_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.type}
                      onClick={() => setAttachOpen(false)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-border/30 hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Textarea */}
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

        {/* Send button */}
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
