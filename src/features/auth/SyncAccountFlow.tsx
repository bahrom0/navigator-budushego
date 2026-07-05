"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CloudSync, LogIn, Check, Loader2, AlertCircle } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { useProfileStore } from "@/stores/profile-store"
import { createProfileSyncPayload } from "@/lib/profile-sync"

export function SyncAccountFlow() {
  const [state, setState] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const handleSync = useCallback(async () => {
    setState("syncing")
    setErrorMsg(null)

    const profile = useProfileStore.getState()
    const payload = createProfileSyncPayload(profile)

    try {
      const res = await fetch("/api/sync-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (result.status !== "success" || !res.ok) {
        setState("error")
        setErrorMsg(result.error)
        return
      }

      useProfileStore.getState().acknowledgeBookmarkDeletes(payload.deleted_bookmark_codes)

      setState("success")
      window.dispatchEvent(new CustomEvent("profile:sync"))
    } catch {
      setState("error")
      setErrorMsg("Ошибка сети. Попробуйте снова.")
    }
  }, [])

  const handleTrigger = useCallback(() => {
    if (!isAuthenticated) {
      const event = new CustomEvent("auth:open")
      window.dispatchEvent(event)
      return
    }
    handleSync()
  }, [isAuthenticated, handleSync])

  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[14px] border border-success/30 bg-success/5 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
            <Check className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Данные синхронизированы</p>
            <p className="text-xs text-text-muted">Ваш профиль сохранён в облаке</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={handleTrigger}
        disabled={state === "syncing"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
      >
        <AnimatePresence mode="wait">
          {state === "syncing" && (
            <motion.span
              key="syncing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Синхронизация...
            </motion.span>
          )}
          {state === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-error"
            >
              <AlertCircle className="h-4 w-4" />
              {errorMsg || "Ошибка синхронизации"}
            </motion.span>
          )}
          {state === "idle" && (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {isAuthenticated ? (
                <>
                  <CloudSync className="h-4 w-4" />
                  Синхронизировать с облаком
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Привязать к аккаунту
                </>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {!isAuthenticated && state === "idle" && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 text-xs text-text-muted"
          >
            Сохраните ваши планы, закладки и достижения в облаке
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
