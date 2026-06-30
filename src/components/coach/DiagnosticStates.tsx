"use client"

import { CheckCircle, ClipboardList, Loader2 } from "lucide-react"
import type { DiagnosticApiQuestion, DiagnosticAnswer } from "@/types/diagnostic"

export function DiagnosticLoading({ onSkip }: { onSkip?: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center rounded-[18px] border border-border bg-card-bg p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
        <ClipboardList className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        Генерация вопросов...
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        Coach подбирает вопросы по вашим предметам
      </p>
      <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="mt-5 text-sm text-text-muted transition-colors hover:text-foreground"
        >
          Пропустить диагностику
        </button>
      ) : null}
    </div>
  )
}

export function DiagnosticDone({
  answers,
  questions,
}: {
  answers: DiagnosticAnswer[]
  questions: DiagnosticApiQuestion[]
}) {
  const correct = answers.filter((a) => a.isCorrect).length
  const total = questions.length
  const skipped = answers.filter((a) => a.skipped).length

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center rounded-[18px] border border-border bg-card-bg p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
        <CheckCircle className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        Диагностика завершена
      </h2>
      <p className="mt-2 text-2xl font-extrabold text-primary">
        {correct} / {total}
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        Правильных ответов{skipped > 0 ? ` · ${skipped} пропущено` : ""}
      </p>
    </div>
  )
}
