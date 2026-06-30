"use client"

import { motion } from "framer-motion"

interface DiagnosticReviewProps {
  explanation: string
  isCorrect: boolean
}

export function DiagnosticReview({ explanation, isCorrect }: DiagnosticReviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mt-4 rounded-[12px] border border-border bg-background p-3"
    >
      <p className="text-xs font-medium text-text-muted">
        {isCorrect ? "Правильно" : "Неправильно"}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
        {explanation}
      </p>
    </motion.div>
  )
}
