"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { ExternalLink, FlaskConical } from "lucide-react"
import { BookmarkButton } from "@/components/signal-cards/BookmarkButton"
import { CompetitionMeter } from "@/components/strategy/CompetitionMeter"
import { evaluateCompetitionForCode } from "@/features/strategy/competition-meter"
import { useRouter } from "next/navigation"
import { logActivityEvent } from "@/lib/activity-logger"

interface NCTSignalCardProps {
  code: string
  title_ru: string
  institution: string
  city: string
  confidence: number
  career_matches: string[]
  whyItFits: string
  matchedInterests: string[]
  taxonomy?: {
    cluster_name_ru?: string
    study_form?: string[]
    study_type?: string[]
  }
  index?: number
  variant?: "default" | "compact"
}

const ACCENT_COLORS = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DC2626",
  "#0891B2",
]

export function NCTSignalCard({
  code,
  title_ru,
  institution,
  city,
  confidence,
  career_matches,
  whyItFits,
  matchedInterests,
  taxonomy,
  index = 0,
  variant = "default",
}: NCTSignalCardProps) {
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length]
  const router = useRouter()
  const confidencePercent = Math.round(confidence * 100)

  const competition = useMemo(
    () => evaluateCompetitionForCode(code, confidence),
    [code, confidence],
  )

  const handleExplain = () => {
    logActivityEvent("view_recommendation", `Подробнее: ${code} - ${title_ru}`)
    router.push(
      `/explain?code=${encodeURIComponent(code)}&title=${encodeURIComponent(title_ru)}`,
    )
  }

  const handleInterview = () => {
    logActivityEvent("start_interview", `Из карточки: ${code} - ${title_ru}`)
    router.push(`/interview?code=${encodeURIComponent(code)}`)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-[20px] border border-border bg-card-bg"
      style={{
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04)",
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div className="p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <span
              className="inline-block rounded-[8px] px-2.5 py-1 text-xs font-semibold tracking-wide"
              style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
            >
              {code}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: confidencePercent >= 80 ? "#10B98114" : confidencePercent >= 60 ? "#F59E0B14" : "#EF444414",
              color: confidencePercent >= 80 ? "#10B981" : confidencePercent >= 60 ? "#F59E0B" : "#EF4444",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
            {confidencePercent}% совпадение
          </div>
        </header>

        <div className="mt-4">
          <h3 className="text-lg font-semibold leading-snug text-foreground">
            {title_ru}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-text-secondary">
            <span className="font-medium">{institution}</span>
            <span className="text-text-muted">·</span>
            <span>{city}</span>
          </div>
        </div>

        {taxonomy?.cluster_name_ru && (
          <p className="mt-2 text-xs font-medium text-text-muted">
            {taxonomy.cluster_name_ru}
          </p>
        )}

        {career_matches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {career_matches.slice(0, 4).map((career) => (
              <span
                key={career}
                className="rounded-[8px] border border-border bg-background px-2.5 py-1 text-xs text-text-secondary"
              >
                {career}
              </span>
            ))}
            {career_matches.length > 4 && (
              <span className="rounded-[8px] px-2.5 py-1 text-xs text-text-muted">
                +{career_matches.length - 4}
              </span>
            )}
          </div>
        )}

        <CompetitionMeter level={competition.level} score={competition.score} reason={competition.reason} />

        {whyItFits && (
          <div
            className="mt-5 rounded-[12px] border border-border bg-background p-4"
            style={{ backgroundColor: `${accentColor}06` }}
          >
            <p className="text-sm leading-relaxed text-text-secondary">
              {whyItFits}
            </p>
            {matchedInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {matchedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-[6px] px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <footer className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <BookmarkButton
            nctCode={code}
            nctTitle={title_ru}
            institution={institution}
            city={city}
          />
          {variant === "default" && (
            <>
              <button
                onClick={handleExplain}
                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-border bg-card-bg px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <ExternalLink className="h-4 w-4 text-text-muted" />
                Подробнее
              </button>
              <button
                onClick={handleInterview}
                className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                <FlaskConical className="h-4 w-4" />
                Проверить себя
              </button>
            </>
          )}
        </footer>
      </div>
    </motion.article>
  )
}