"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, FlaskConical } from "lucide-react"
import { nctCodes } from "@/lib/ai/nct-match"
import { NCTSignalCard } from "@/components/signal-cards/NCTSignalCard"
import { cacheGet, cacheSet } from "@/lib/cache"

interface ExplainResponse {
  status: "success" | "error"
  data?: {
    explanation: {
      whyItFits: string
      matchedInterests: string[]
      matchedCareers: string[]
      similarCodes: { code: string; title_ru: string; reason: string }[]
    }
    result: {
      code: string
      title_ru: string
      institution: string
      city: string
      confidence: number
      career_matches: string[]
      reasoning: string
      cluster_name_ru?: string
      study_form?: string[]
      study_type?: string[]
    }
  }
  error?: string
}

export default function ExplainContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<ExplainResponse | null>(null)

  const code = searchParams.get("code") || ""

  useEffect(() => {
    if (!code) return
    loadExplanation()
  }, [code])

  async function loadExplanation() {
    setLoading(true)
    setError(null)

    const cacheKey = `explain:${code.replace(/[\s-]+/g, "").toUpperCase()}`
    const cached = cacheGet<ExplainResponse>(cacheKey)
    if (cached?.data) {
      setResponse(cached)
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title_ru: "",
          career_matches: [],
          userInterests: [],
          selectedCategories: [],
        }),
      })

      const raw = await res.text()
      let data: ExplainResponse
      try {
        data = JSON.parse(raw) as ExplainResponse
      } catch {
        setError("Невалидный ответ сервера")
        setLoading(false)
        return
      }

      if (data.status === "error" || !data.data) {
        setError(data.error || "Не удалось получить объяснение")
        return
      }

      cacheSet(cacheKey, data)
      setResponse(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка сети"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ExplainSkeleton />
  }

  if (error || !response?.data) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="text-sm font-medium text-error">Не удалось загрузить объяснение</p>
          {error && <p className="mt-2 text-sm text-text-secondary">{error}</p>}
          <button onClick={loadExplanation} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover">
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
          <button onClick={() => router.back()} className="mt-3 inline-flex h-11 items-center justify-center rounded-[14px] px-6 text-base font-medium text-text-secondary hover:text-foreground">
            Вернуться назад
          </button>
        </motion.div>
      </main>
    )
  }

  const nctResult = nctCodes.find(
    (c) => c.code.replace(/[\s-]+/g, "").toUpperCase() === code.replace(/[\s-]+/g, "").toUpperCase(),
  )

  const explanationFromApi = response?.data?.explanation
  const resultFromApi = response?.data?.result

  const displayCode = nctResult?.code || resultFromApi?.code || code
  const displayTitle = nctResult?.title_ru || resultFromApi?.title_ru || ""
  const displayInstitution = nctResult?.institution || resultFromApi?.institution || ""
  const displayCity = nctResult?.city || resultFromApi?.city || ""
  const displayConfidence = nctResult?.confidence ?? resultFromApi?.confidence ?? 0
  const displayCareers = nctResult?.career_matches || resultFromApi?.career_matches || []
  const displayWhyItFits = explanationFromApi?.whyItFits || ""
  const displayInterests = explanationFromApi?.matchedInterests || []
  const displayCluster = nctResult?.cluster ?? 0
  const displayClusterName = nctResult?.cluster_name_ru || resultFromApi?.cluster_name_ru || ""
  const displayStudyForm = nctResult?.study_form || resultFromApi?.study_form || []
  const displayStudyType = nctResult?.study_type || resultFromApi?.study_type || []
  const displaySimilarCodes = explanationFromApi?.similarCodes || []

  return (
    <main className="flex flex-1 flex-col px-6 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 py-6">
        <BackButton />

        <div>
          <span className="text-xs font-semibold tracking-wide text-primary">{displayCode}</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{displayTitle}</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {displayInstitution}{displayCity ? ` \u00b7 ${displayCity}` : ""}
          </p>
        </div>

        <NCTSignalCard
          code={displayCode}
          title_ru={displayTitle}
          institution={displayInstitution}
          city={displayCity}
          confidence={displayConfidence}
          career_matches={displayCareers}
          whyItFits={displayWhyItFits}
          matchedInterests={displayInterests}
          cluster={displayCluster}
          taxonomy={{
            cluster_name_ru: displayClusterName,
            study_form: displayStudyForm,
            study_type: displayStudyType,
          }}
          index={0}
          variant="compact"
        />

        {displaySimilarCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] border border-border bg-card-bg p-6"
          >
            <h2 className="text-base font-semibold text-foreground">Похожие направления</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {displaySimilarCodes.map((similar) => (
                <div
                  key={similar.code}
                  className="rounded-[14px] border border-border bg-background p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                >
                  <span className="text-xs font-semibold text-primary">{similar.code}</span>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{similar.title_ru}</p>
                  <p className="mt-1 text-xs text-text-muted leading-relaxed">{similar.reason}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <button
          onClick={() => router.push(`/interview?code=${encodeURIComponent(code)}`)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <FlaskConical className="h-5 w-5" />
          Пройти профориентационное интервью
        </button>
      </div>
    </main>
  )
}

function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") {
          if (window.history.length > 2) router.back()
          else router.push("/recommendations")
        }
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-bg transition-colors hover:bg-background"
    >
      <ArrowLeft className="h-4 w-4 text-text-secondary" />
    </button>
  )
}

function ExplainSkeleton() {
  return (
    <main className="flex flex-1 flex-col px-6 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6 py-6">
        <div className="h-10 w-10 animate-pulse rounded-[12px] bg-card-bg" />
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-background" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-background" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-background" />
        </div>
        <div className="rounded-[20px] border border-border bg-card-bg p-6">
          <div className="h-6 w-56 animate-pulse rounded bg-background" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-background" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-background" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-background" />
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-10 w-20 animate-pulse rounded-[12px] bg-background" />
            <div className="h-10 w-20 animate-pulse rounded-[12px] bg-background" />
          </div>
        </div>
        <div className="h-32 animate-pulse rounded-[20px] bg-card-bg" />
      </div>
    </main>
  )
}