"use client"

import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"
import { FlaskConical, ArrowRight } from "lucide-react"

export function ProfileInterviewsList() {
  const interviews = useProfileStore((s) => s.interviews)

  if (interviews.length === 0) {
    return (
      <div className="rounded-[16px] border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="h-4 w-4 text-primary" />
          Интервью
        </div>
        <p className="text-sm text-text-muted">Пройдите AI-собеседование, чтобы появился результат.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="h-4 w-4 text-primary" />
          Интервью
        </div>
        <Link
          href="/dashboard/interviews"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Все интервью
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {interviews.slice(0, 5).map((interview) => (
          <div key={interview.id} className="rounded-[12px] bg-card-bg px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{interview.nctTitle}</span>
              {interview.level && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {interview.level}
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted">
              {interview.questions.length} вопросов
            </span>
          </div>
        ))}
      </div>
      {interviews.length > 5 && (
        <p className="mt-2 text-xs text-text-muted">+ ещё {interviews.length - 5} интервью</p>
      )}
    </div>
  )
}
