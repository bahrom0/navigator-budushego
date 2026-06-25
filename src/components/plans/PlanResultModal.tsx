"use client"

import { motion } from "framer-motion"
import { CheckCircle, RefreshCw, TrendingUp, XCircle } from "lucide-react"
import type { PlanTestEvaluation } from "@/types/plan"

interface PlanResultModalProps {
  evaluation: PlanTestEvaluation
  onRegenerate: () => void
  onClose: () => void
  loading?: boolean
}

export function PlanResultModal({ evaluation, onRegenerate, onClose, loading }: PlanResultModalProps) {
  const passed = evaluation.passed

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[20px] border border-border bg-card-bg p-8 text-center shadow-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        >
          {passed ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
              <XCircle className="h-8 w-8 text-error" />
            </div>
          )}
        </motion.div>

        <h2 className="mt-5 text-xl font-bold text-foreground">
          {passed ? "План пройден!" : "План не пройден"}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{evaluation.message}</p>

        {passed && evaluation.newLevel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
          >
            <TrendingUp className="h-4 w-4" />
            Новый уровень:{" "}
            {evaluation.newLevel === "intermediate" ? "Средний" : "Продвинутый"}
          </motion.div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          {!passed && (
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Создать новый план
            </button>
          )}
          <button
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-[14px] border border-border px-6 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
          >
            {passed ? "Отлично!" : "Вернуться к плану"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
