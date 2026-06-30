"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Clock, X } from "lucide-react"
import type { RoadmapDurationWeeks } from "@/types/coach"

const DURATIONS: { value: RoadmapDurationWeeks; label: string }[] = [
  { value: 1, label: "1 неделя" },
  { value: 2, label: "2 недели" },
  { value: 4, label: "4 недели" },
  { value: 12, label: "12 недель" },
]

export interface RoadmapDurationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (durationWeeks: RoadmapDurationWeeks) => void
  loading?: boolean
}

export function RoadmapDurationModal({ open, onClose, onConfirm, loading }: RoadmapDurationModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-sm overflow-hidden rounded-[18px] bg-card-bg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Длительность Roadmap
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-text-secondary">
                Выберите длительность маршрута подготовки. Coach построит roadmap
                ровно на указанное количество недель.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    disabled={loading}
                    onClick={() => onConfirm(d.value)}
                    className="inline-flex h-12 items-center justify-center rounded-[12px] border border-border bg-background text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary-light disabled:opacity-50"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
