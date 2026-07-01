"use client"

import { motion } from "framer-motion"
import { MapPin, ArrowRight, Shuffle, Lightbulb } from "lucide-react"
import type { RouteSimulation } from "@/types/strategy"

interface RouteSimulationProps {
  simulation: RouteSimulation
}

export function RouteSimulation({ simulation }: RouteSimulationProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-[20px] border border-border bg-card-bg p-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          {simulation.reasoning}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[20px] border border-success/30 bg-success/5 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-success" />
            <h3 className="text-sm font-semibold text-foreground">Основной маршрут</h3>
          </div>

          {simulation.primaryCluster && (
            <span className="inline-block rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success mb-4">
              {simulation.primaryCluster.name}
            </span>
          )}

          <div className="space-y-3">
            {simulation.primaryCodes.map((code, idx) => (
              <div key={code.code} className="rounded-[12px] bg-background/70 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-primary">{code.code}</span>
                    <p className="mt-0.5 text-sm font-medium text-foreground truncate">{code.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{code.reason}</p>
                  </div>
                  <span className="flex-shrink-0 ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">
                    {idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="rounded-[20px] border border-warning/30 bg-warning/5 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shuffle className="h-5 w-5 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Запасной маршрут</h3>
          </div>

          {simulation.backupCluster && (
            <span className="inline-block rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning mb-4">
              {simulation.backupCluster.name}
            </span>
          )}

          <div className="space-y-3">
            {simulation.backupCodes.map((code, idx) => (
              <div key={code.code} className="rounded-[12px] bg-background/70 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-warning">{code.code}</span>
                    <p className="mt-0.5 text-sm font-medium text-foreground truncate">{code.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{code.reason}</p>
                  </div>
                  <span className="flex-shrink-0 ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-warning/10 text-xs font-bold text-warning">
                    {idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="rounded-[20px] border border-border bg-card-bg p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Рекомендации по подготовке</h3>
        </div>
        <div className="space-y-2">
          {simulation.preparationTips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-text-secondary">{tip}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
