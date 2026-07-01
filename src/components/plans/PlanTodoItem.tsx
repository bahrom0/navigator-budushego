"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

interface PlanTodoItemProps {
  id: string
  label: string
  completed: boolean
  onToggle: (id: string) => void
  disabled?: boolean
}

export function PlanTodoItem({ id, label, completed, onToggle, disabled }: PlanTodoItemProps) {
  return (
    <motion.button
      initial={false}
      onClick={() => { if (!disabled) onToggle(id) }}
      disabled={disabled}
      className={`group flex w-full items-start gap-3 rounded-[14px] border px-4 py-3 text-left transition-all ${
        completed
          ? "border-success/30 bg-success/[0.04]"
          : "border-border bg-card-bg hover:bg-foreground/5"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          completed
            ? "border-success bg-success"
            : "border-text-muted group-hover:border-primary"
        }`}
      >
        {completed && <Check className="h-3 w-3 text-white" />}
      </span>
      <span
        className={`text-sm leading-relaxed transition-colors ${
          completed ? "text-text-muted line-through" : "text-foreground"
        }`}
      >
        {label}
      </span>
    </motion.button>
  )
}
