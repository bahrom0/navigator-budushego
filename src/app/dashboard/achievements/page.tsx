"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Trophy, Lock } from "lucide-react"
import { useProfileStore } from "@/stores/profile-store"
import { ACHIEVEMENT_DEFS } from "@/features/achievements"

export default function DashboardAchievements() {
  const [hydrated, setHydrated] = useState(false)
  const storeAchievements = useProfileStore((s) => s.achievements)

  useEffect(() => { setHydrated(true) }, [])

  const unlockedMap = new Map(
    storeAchievements.filter((a) => a.unlockedAt).map((a) => [a.id, a.unlockedAt!])
  )

  const unlockedCount = unlockedMap.size

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Достижения</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {!hydrated || unlockedCount === 0
            ? "Достижения появятся после выполнения действий"
            : `Получено ${unlockedCount} из ${ACHIEVEMENT_DEFS.length}`}
        </p>
      </motion.div>

      {ACHIEVEMENT_DEFS.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Список достижений пуст</p>
          <p className="mt-1 text-sm text-text-secondary">
            Достижения появятся в будущих обновлениях.
          </p>
        </motion.div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENT_DEFS.map((def, i) => {
          const unlockedAt = unlockedMap.get(def.id)
          const unlocked = !!unlockedAt

          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`rounded-[16px] border p-4 transition-colors ${
                unlocked
                  ? "border-warning/30 bg-warning/5"
                  : "border-border bg-card-bg opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    unlocked
                      ? "bg-warning text-white"
                      : "bg-border text-text-muted"
                  }`}
                >
                  {unlocked ? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${unlocked ? "text-foreground" : "text-text-secondary"}`}>
                      {def.title}
                    </p>
                    {unlocked && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success shrink-0">
                        Получено
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">{def.description}</p>
                  {unlocked && (
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {new Date(unlockedAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
