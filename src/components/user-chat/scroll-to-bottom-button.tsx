"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowDown } from "lucide-react"

interface ScrollToBottomButtonProps {
  visible: boolean
  unreadDelta?: number
  onClick: () => void
}

export function ScrollToBottomButton({
  visible,
  unreadDelta = 0,
  onClick,
}: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          onClick={onClick}
          aria-label="Прокрутить к последнему сообщению"
          className="absolute bottom-4 left-1/2 z-30 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card-bg/95 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-md backdrop-blur hover:bg-card-bg"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {unreadDelta > 0 ? (
            <span className="font-semibold text-primary">
              {unreadDelta > 99 ? "99+" : unreadDelta}
            </span>
          ) : (
            <span>Вниз</span>
          )}
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
