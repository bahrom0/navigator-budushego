"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, Check, CheckCheck, Pencil, Clock } from "lucide-react"
import type { DeliveryStatus } from "./grouping"

export interface MessageInfoData {
  id: string
  content: string | null
  senderName: string | null
  createdAt: string
  editedAt: string | null
  deleted: boolean
  delivery: DeliveryStatus | null
  own: boolean
}

interface MessageInfoProps {
  data: MessageInfoData | null
  onClose: () => void
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date}, ${time}`
}

export function MessageInfo({ data, onClose }: MessageInfoProps) {
  useEffect(() => {
    if (!data) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [data, onClose])

  return (
    <AnimatePresence>
      {data ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card-bg p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Информация о сообщении
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-border/40 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {data.content ? (
              <div className="mb-4 max-h-32 overflow-y-auto rounded-xl bg-border/30 px-3 py-2 text-sm text-foreground">
                {data.deleted ? (
                  <span className="italic text-text-muted">Сообщение удалено</span>
                ) : (
                  <p className="whitespace-pre-wrap break-words">
                    {data.content}
                  </p>
                )}
              </div>
            ) : null}

            <dl className="space-y-3 text-sm">
              <Row label="Отправитель">
                <span className="text-foreground">
                  {data.senderName ?? (data.own ? "Вы" : "Собеседник")}
                </span>
              </Row>
              <Row
                label="Создано"
                icon={<Clock className="h-3.5 w-3.5" />}
              >
                <span className="text-foreground">
                  {formatDateTime(data.createdAt)}
                </span>
              </Row>
              {data.editedAt ? (
                <Row
                  label="Изменено"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                >
                  <span className="text-foreground">
                    {formatDateTime(data.editedAt)}
                  </span>
                </Row>
              ) : null}
              {data.own && data.delivery ? (
                <Row label="Статус">
                  <DeliveryBadge status={data.delivery} />
                </Row>
              ) : null}
            </dl>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

interface RowProps {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}

function Row({ label, icon, children }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

interface DeliveryBadgeProps {
  status: DeliveryStatus
}

function DeliveryBadge({ status }: DeliveryBadgeProps) {
  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-1 text-[#60A5FA]">
        <CheckCheck className="h-3.5 w-3.5" />
        <span>Прочитано</span>
      </span>
    )
  }
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 text-text-secondary">
        <CheckCheck className="h-3.5 w-3.5" />
        <span>Доставлено</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <Check className="h-3.5 w-3.5" />
      <span>Отправлено</span>
    </span>
  )
}
