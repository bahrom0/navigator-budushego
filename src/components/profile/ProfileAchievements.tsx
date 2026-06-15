"use client"

import { useRef, useState, useEffect } from "react"
import { useProfileStore } from "@/stores/profile-store"
import { ACHIEVEMENT_DEFS } from "@/features/achievements"
import { Trophy } from "lucide-react"
import { motion } from "framer-motion"

interface ProfileAchievementsListProps {
  limit?: number
}

export function ProfileAchievementsList({ limit = 6 }: ProfileAchievementsListProps) {
  const storeAchievements = useProfileStore((s) => s.achievements)
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set())
  const prevCountRef = useRef(storeAchievements.length)

  useEffect(() => {
    if (storeAchievements.length > prevCountRef.current) {
      const newOnes = storeAchievements
        .filter((a) => a.unlockedAt)
        .map((a) => a.id)
        .filter((id) => !recentIds.has(id))
      if (newOnes.length > 0) {
        setRecentIds((prev) => {
          const next = new Set(prev)
          newOnes.forEach((id) => next.add(id))
          return next
        })
        const timer = setTimeout(() => {
          setRecentIds(new Set())
        }, 4000)
        prevCountRef.current = storeAchievements.length
        return () => clearTimeout(timer)
      }
    }
    prevCountRef.current = storeAchievements.length
  }, [storeAchievements.length])

  const unlockedMap = new Map(
    storeAchievements.filter((a) => a.unlockedAt).map((a) => [a.id, a.unlockedAt!]),
  )

  const visible = ACHIEVEMENT_DEFS.slice(0, limit)

  if (visible.length === 0) {
    return (
      <div className="rounded-[16px] border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trophy className="h-4 w-4 text-warning" />
          Достижения
        </div>
        <p className="text-sm text-text-muted">Достижения появятся после выполнения действий.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Trophy className="h-4 w-4 text-warning" />
        Достижения
      </div>
      <div className="flex flex-col gap-2">
        {visible.map((def) => {
          const unlockedAt = unlockedMap.get(def.id)
          const unlocked = !!unlockedAt
          const isRecent = recentIds.has(def.id)
          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: isRecent
                  ? [
                      "0 0 0 0 rgba(251,191,36,0)",
                      "0 0 16px 2px rgba(251,191,36,0.3)",
                      "0 0 0 0 rgba(251,191,36,0)",
                    ]
                  : "none",
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex items-center gap-3 rounded-[12px] px-3 py-2 ${unlocked ? "bg-warning/10" : "bg-card-bg opacity-60"}`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${unlocked ? "bg-warning text-white" : "bg-border text-text-muted"}`}
              >
                <Trophy className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{def.title}</span>
                {unlocked ? (
                  <span className="text-xs text-text-muted">
                    {new Date(unlockedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">Не получено</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
