"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Lightbulb, Target } from "lucide-react"
import type { FitScoreResult } from "@/types/strategy"

interface FitScoreBreakdownProps {
  result: FitScoreResult
}

export function FitScoreBreakdown({ result }: FitScoreBreakdownProps) {
  const scoreColor = result.overallScore >= 80
    ? "text-success"
    : result.overallScore >= 60
    ? "text-warning"
    : "text-error"

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-[20px] border border-border bg-card-bg p-6 text-center"
      >
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={
                result.overallScore >= 80
                  ? "var(--success)"
                  : result.overallScore >= 60
                  ? "var(--warning)"
                  : "var(--error)"
              }
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - result.overallScore / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <span className={`absolute text-3xl font-bold ${scoreColor}`}>
            {result.overallScore}
          </span>
        </div>
        <p className="mt-2 text-sm text-text-muted">из 100</p>
        <p className="mt-3 text-sm text-text-secondary max-w-md mx-auto">
          {result.summary}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {result.factors.map((factor, idx) => (
          <motion.div
            key={factor.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.25 }}
            className="rounded-[16px] border border-border bg-card-bg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{factor.name}</span>
              <span className="text-xs font-semibold text-text-muted">{factor.score}/{factor.maxScore}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  factor.score >= 80 ? "bg-success" : factor.score >= 60 ? "bg-warning" : "bg-error"
                }`}
              />
            </div>
            <p className="mt-2 text-xs text-text-secondary">{factor.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {result.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="rounded-[16px] border border-success/30 bg-success/5 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-success" />
              <h3 className="text-sm font-semibold text-foreground">Сильные стороны</h3>
            </div>
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {result.weaknesses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.3 }}
            className="rounded-[16px] border border-warning/30 bg-warning/5 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Зоны роста</h3>
            </div>
            <ul className="space-y-1.5">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                  {w}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {result.improvementPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.4 }}
          className="rounded-[20px] border border-border bg-card-bg p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Что улучшить за 30 дней</h3>
          </div>
          <div className="space-y-2">
            {result.improvementPlan.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
