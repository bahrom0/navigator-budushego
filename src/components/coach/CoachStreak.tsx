"use client"

import { motion } from "framer-motion"
import { Flame, Trophy } from "lucide-react"

export interface CoachStreakProps {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
}

function generateLastDays(n: number): { date: Date; label: string }[] {
  const days: { date: Date; label: string }[] = []
  const dayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ date: d, label: dayLabels[d.getDay()] })
  }
  return days
}

function isActiveDay(date: Date, lastActiveDate: string, currentStreak: number): boolean {
  if (!lastActiveDate) return false
  const lastActive = new Date(lastActiveDate)
  const diff = Math.round((lastActive.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 && diff < currentStreak
}

export function CoachStreak({ currentStreak, longestStreak, lastActiveDate }: CoachStreakProps) {
  const days = generateLastDays(28)

  return (
    <div className="rounded-[18px] border border-border bg-card-bg p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/10">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {currentStreak}
            </p>
            <p className="text-xs text-text-secondary">текущая серия (дней)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {longestStreak}
            </p>
            <p className="text-xs text-text-secondary">рекорд</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-text-secondary">
          Активность за последние 28 дней
        </p>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const active = isActiveDay(day.date, lastActiveDate, currentStreak)
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.008, duration: 0.15, ease: "easeOut" }}
                className={`aspect-square rounded-[4px] ${
                  active
                    ? "bg-warning"
                    : "bg-border/35"
                }`}
                title={`${day.date.toLocaleDateString("ru-RU")}${active ? " — активно" : ""}`}
              />
            )
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
          <span>Меньше</span>
          <div className="flex gap-0.5">
            {["var(--border)", "#FDE68A", "#FCD34D", "#F59E0B"].map((color) => (
              <span
                key={color}
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span>Больше</span>
        </div>
      </div>
    </div>
  )
}
