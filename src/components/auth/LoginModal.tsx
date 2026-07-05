"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Globe, Check } from "lucide-react"
import { Input } from "@/components/Input"
import { useAuthStore } from "@/stores/auth-store"
import { useProfileStore } from "@/stores/profile-store"
import { createProfileSyncPayload } from "@/lib/profile-sync"

export function LoginModal() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced">("idle")
  const { login, signup, signInWithGoogle, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("auth:open", handler as EventListener)

    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "auth_failed") {
      setOpen(true)
      setError("Ошибка аутентификации. Проверьте настройки OAuth провайдера.")
    }

    return () => window.removeEventListener("auth:open", handler as EventListener)
  }, [])

  useEffect(() => {
    if (open) {
      setEmail("")
      setPassword("")
      setError(null)
      setSubmitting(false)
      setSyncState("idle")
      setMode("login")
    }
  }, [open])

  const triggerSync = useCallback(async () => {
    setSyncState("syncing")
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
        setError(result.error || "Ошибка синхронизации")
        setSyncState("idle")
        return
      }

      useProfileStore.getState().acknowledgeBookmarkDeletes(payload.deleted_bookmark_codes)

      setSyncState("synced")
      window.dispatchEvent(new CustomEvent("profile:sync"))
      setTimeout(() => setOpen(false), 1200)
    } catch {
      setError("Ошибка сети при синхронизации")
      setSyncState("idle")
    }
  }, [])

  const handleEmailSubmit = useCallback(async () => {
    if (!email || !password) {
      setError("Заполните все поля")
      return
    }
    setSubmitting(true)
    setError(null)

    const fn = mode === "login" ? login : signup
    const { error: resultError } = await fn(email, password)

    if (resultError) {
      setError(resultError)
      setSubmitting(false)
      return
    }

    triggerSync()
  }, [email, password, mode, login, signup, triggerSync])

  const handleGoogle = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа через Google")
      setSubmitting(false)
    }
  }, [signInWithGoogle])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-card-bg p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {syncState === "synced" ? "Готово" : mode === "login" ? "Войти" : "Создать аккаунт"}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 transition-colors hover:bg-foreground/5" aria-label="Закрыть">
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            </div>

            {syncState === "syncing" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-text-secondary">Синхронизация профиля...</p>
              </div>
            )}

            {syncState === "synced" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">Профиль синхронизирован</p>
              </div>
            )}

            {syncState === "idle" && (
              <>
                <div className="flex flex-col gap-4">
                  <Input label="Email" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
                  <Input label="Пароль" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-error">
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleEmailSubmit}
                  disabled={submitting}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Войти" : "Зарегистрироваться"}
                </motion.button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card-bg px-3 text-xs text-text-muted">или</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
                >
                  <Globe className="h-4 w-4" />
                  Продолжить с Google
                </motion.button>

                <p className="mt-4 text-center text-xs text-text-muted">
                  {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                  <button
                    onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null) }}
                    className="font-medium text-primary hover:underline"
                  >
                    {mode === "login" ? "Зарегистрироваться" : "Войти"}
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
