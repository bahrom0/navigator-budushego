"use client"

import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bookmark } from "lucide-react"
import { toast } from "sonner"
import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"

interface BookmarkButtonProps {
  nctCode: string
  nctTitle: string
  institution?: string
  city?: string
}

export function BookmarkButton({ nctCode, nctTitle, institution, city }: BookmarkButtonProps) {
  const bookmarks = useProfileStore((s) => s.bookmarks)
  const toggleBookmark = useProfileStore((s) => s.toggleBookmark)
  const [justSaved, setJustSaved] = useState(false)

  const isSaved = bookmarks.some((b) => b.nctCode === nctCode)

  const handleClick = useCallback(() => {
    const wasSaved = isSaved
    toggleBookmark({ nctCode, nctTitle, institution, city })
    if (!wasSaved) {
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 400)
      logActivityEvent("bookmark_code", `${nctCode} - ${nctTitle}`)
      toast("Добавлено в закладки", {
        description: nctTitle,
        duration: 2000,
      })
    }
  }, [toggleBookmark, isSaved, nctCode, nctTitle, institution, city])

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={justSaved ? { scale: [1, 1.25, 1] } : isSaved ? { scale: 1 } : { scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
      aria-label={isSaved ? "Удалить из закладок" : "Добавить в закладки"}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isSaved ? "saved" : "unsaved"}
          initial={justSaved ? { scale: 0.5, rotate: -10 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Bookmark
            className={`h-4 w-4 ${isSaved ? "text-primary" : "text-text-muted"}`}
            fill={isSaved ? "currentColor" : "none"}
          />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
