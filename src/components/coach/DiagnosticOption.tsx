"use client"

import { motion } from "framer-motion"
import { CheckCircle, XCircle } from "lucide-react"

interface DiagnosticOptionProps {
  text: string
  index: number
  selected: number | null
  correctIndex: number
  showResult: boolean
  onSelect: (i: number) => void
}

export function DiagnosticOption({
  text,
  index,
  selected,
  correctIndex,
  showResult,
  onSelect,
}: DiagnosticOptionProps) {
  const isSelected = selected === index
  const isCorrect = index === correctIndex

  let borderColor = "border-border hover:border-primary/40"
  if (showResult && isCorrect) borderColor = "border-emerald-500 bg-emerald-50/50"
  if (showResult && isSelected && !isCorrect) borderColor = "border-red-400 bg-red-50/50"
  if (showResult && !isCorrect && !isSelected) borderColor = "border-border opacity-50"
  if (!showResult && isSelected) borderColor = "border-primary bg-primary-light/40"

  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={isSelected ?? false}
        disabled={showResult}
        onClick={() => onSelect(index)}
        className={`flex h-12 w-full items-center rounded-[12px] border px-4 text-left text-sm transition-colors ${borderColor} disabled:cursor-default`}
      >
        <span className="flex-1">{text}</span>
        {showResult && isCorrect ? (
          <CheckCircle className="ml-2 h-4 w-4 shrink-0 text-emerald-600" />
        ) : null}
        {showResult && isSelected && !isCorrect ? (
          <XCircle className="ml-2 h-4 w-4 shrink-0 text-red-500" />
        ) : null}
      </button>
    </li>
  )
}
