"use client"

import { motion } from "framer-motion"
import { RefreshCw } from "lucide-react"

export interface CoachErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function CoachErrorBanner({ message, onDismiss }: CoachErrorBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-start gap-3 rounded-[14px] border border-error/30 bg-error/5 p-4"
      role="alert"
    >
      <p className="flex-1 text-sm text-error">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-8 items-center gap-1 rounded-[10px] px-2 text-xs font-medium text-error transition-colors hover:bg-error/10"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Закрыть
      </button>
    </motion.div>
  )
}
