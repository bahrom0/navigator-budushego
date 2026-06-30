"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"
import { createClient } from "@/lib/supabase/client"

interface SavePlanButtonProps {
  nctCode: string
  nctTitle: string
}

export function SavePlanButton({ nctCode, nctTitle }: SavePlanButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const profilePlans = useProfileStore((s) => s.plans)

  const alreadySaved = profilePlans.some((p) => p.nctCode === nctCode)

  const handleSave = useCallback(async () => {
    if (state === "loading") return

    setState("loading")
    setErrorMsg(null)

    try {
      const existing = profilePlans.find((p) => p.nctCode === nctCode)
      if (!existing) {
        setState("error")
        setErrorMsg("План не найден в профиле. Сгенерируйте план сначала.")
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setState("error")
        setErrorMsg("Войдите в аккаунт, чтобы сохранить план.")
        return
      }

      const payload = {
        user_id: user.id,
        goal_id: existing.goalId ?? null,
        nct_code: existing.nctCode,
        nct_title: existing.nctTitle,
        level: existing.level,
        university: null,
        profession: null,
        city: null,
        goals: existing.goals,
        stages: existing.stages,
        completed_steps: existing.completedSteps ?? [],
        status: existing.status ?? "active",
        plan_type: existing.planType ?? "general",
        roadmap_id: existing.roadmapId ?? null,
        updated_at: new Date().toISOString(),
      }

      const { data: currentPlan, error: selectError } = await supabase
        .from("plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("nct_code", existing.nctCode)
        .eq("plan_type", existing.planType ?? "general")
        .maybeSingle()

      if (selectError) {
        throw selectError
      }

      const result = currentPlan?.id
        ? await supabase.from("plans").update(payload).eq("id", currentPlan.id).select("id").single()
        : await supabase.from("plans").insert(payload).select("id").single()

      if (result.error) {
        throw result.error
      }

      setState("success")
      logActivityEvent("save_plan", `План сохранён в профиле: ${nctCode}`)
    } catch (err) {
      setState("error")
      setErrorMsg(err instanceof Error ? err.message : "Ошибка сети. Попробуйте снова.")
    }
  }, [nctCode, profilePlans, state])

  if (!isAuthenticated) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs text-text-muted">
        <CloudOff className="h-3.5 w-3.5" />
        <span>Войдите в аккаунт для сохранения</span>
      </div>
    )
  }

  if (alreadySaved && state === "idle") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-4 py-2 text-xs font-medium text-success">
        <Check className="h-3.5 w-3.5" />
        <span>Сохранено</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <motion.button
        whileHover={state !== "loading" ? { scale: 1.02 } : undefined}
        whileTap={state !== "loading" ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={handleSave}
        disabled={state === "loading" || state === "success"}
        className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-border bg-card-bg px-4 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
      >
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Сохранение...
            </motion.span>
          )}
          {state === "success" && (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center gap-2 text-success"
            >
              <Check className="h-4 w-4" />
              Сохранено
            </motion.span>
          )}
          {state === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              Повторить
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
              <Cloud className="h-4 w-4" />
              Сохранить в облако
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {state === "error" && errorMsg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-error"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
