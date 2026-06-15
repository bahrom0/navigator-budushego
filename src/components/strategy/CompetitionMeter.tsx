"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Shield, ShieldCheck, ShieldAlert, ArrowLeftRight } from "lucide-react"
import type { CompetitionLevel } from "@/types/strategy"

interface CompetitionMeterProps {
  level: CompetitionLevel
  score: number
  reason: string
}

const config: Record<CompetitionLevel, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  high: {
    label: "Высокий конкурс",
    color: "text-error",
    bg: "bg-error/5",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    label: "Средний конкурс",
    color: "text-warning",
    bg: "bg-warning/5",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  low: {
    label: "Низкий конкурс",
    color: "text-success",
    bg: "bg-success/5",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  risky: {
    label: "Риск не пройти",
    color: "text-error",
    bg: "bg-error/5",
    icon: <Shield className="h-4 w-4" />,
  },
  backup: {
    label: "Запасной вариант",
    color: "text-text-muted",
    bg: "bg-background",
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
}

export function CompetitionMeter({ level, score, reason }: CompetitionMeterProps) {
  const cfg = config[level]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`mt-3 rounded-[12px] border border-border ${cfg.bg} p-3`}
    >
      <div className="flex items-center gap-2">
        <span className={cfg.color}>{cfg.icon}</span>
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        <span className="ml-auto text-xs font-mono text-text-muted">{score}%</span>
      </div>

      <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${level === "high" || level === "risky" ? "bg-error" : level === "medium" ? "bg-warning" : level === "low" ? "bg-success" : "bg-text-muted"}`}
        />
      </div>

      <p className="mt-1.5 text-xs text-text-secondary">{reason}</p>
    </motion.div>
  )
}
