"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { Shield, Scale, Target } from "lucide-react"
import type { StrategyOption } from "@/types/strategy"

interface StrategyCardsProps {
  strategies: StrategyOption[]
}

const strategyIcons: Record<string, ReactNode> = {
  safe: <Shield className="h-5 w-5" />,
  balanced: <Scale className="h-5 w-5" />,
  ambitious: <Target className="h-5 w-5" />,
}

const strategyColors: Record<string, { border: string; bg: string; icon: string }> = {
  safe: { border: "border-success/30", bg: "bg-success/5", icon: "text-success" },
  balanced: { border: "border-warning/30", bg: "bg-warning/5", icon: "text-warning" },
  ambitious: { border: "border-error/30", bg: "bg-error/5", icon: "text-error" },
}

export function StrategyCards({ strategies }: StrategyCardsProps) {
  if (strategies.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {strategies.map((strategy, idx) => {
        const colors = strategyColors[strategy.type] ?? strategyColors.safe

        return (
          <motion.div
            key={strategy.type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.25 }}
            className={`rounded-[20px] border-2 ${colors.border} ${colors.bg} p-6`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-background/80 ${colors.icon}`}>
                {strategyIcons[strategy.type]}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{strategy.title}</h3>
                <span className={`inline-block mt-0.5 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium ${colors.icon}`}>
                  {strategy.risk} риск
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {strategy.description}
            </p>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
                <span>Вероятность успеха</span>
                <span className={`font-semibold ${colors.icon}`}>{strategy.successProbability}</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Рекомендуемые направления
              </h4>
              <div className="space-y-2">
                {strategy.recommendedCodes.map((code) => (
                  <div key={code.code} className="rounded-[12px] bg-background/70 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-primary">{code.code}</span>
                    <p className="mt-0.5 truncate font-medium text-foreground">{code.title}</p>
                    <p className="truncate text-xs text-text-muted">{code.institution}</p>
                  </div>
                ))}
              </div>
            </div>

            {strategy.fallbackCodes.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Запасные варианты
                </h4>
                <div className="space-y-1.5">
                  {strategy.fallbackCodes.map((code) => (
                    <div key={code.code} className="text-sm">
                      <span className="font-mono text-xs text-text-muted">{code.code}</span>
                      <span className="ml-2 text-text-secondary">{code.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
