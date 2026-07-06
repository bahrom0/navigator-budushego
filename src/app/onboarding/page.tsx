"use client"

import { useEffect } from "react"
import { Sparkles } from "lucide-react"
import { useOnboardingStore, hydrateOnboardingStore } from "@/stores/onboarding-store"
import { StepIndicator } from "./_components/StepIndicator"
import { StepLocation } from "./_components/StepLocation"
import { StepProfile } from "./_components/StepProfile"

export default function OnboardingPage() {
  const { currentStep, _loaded } = useOnboardingStore()

  useEffect(() => {
    hydrateOnboardingStore()
  }, [])

  if (!_loaded) return null

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-[var(--marketing-bg)] text-[var(--marketing-foreground)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(236,227,215,0.72),transparent_56%)] dark:bg-[radial-gradient(circle_at_top,rgba(88,99,125,0.18),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgba(91,78,64,0.08)_1px,transparent_0)] [background-size:22px_22px] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(221,216,209,0.08)_1px,transparent_0)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.78),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(109,122,146,0.16),transparent_70%)]" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <section className="w-full max-w-2xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] px-4 py-2 text-xs font-medium text-[var(--marketing-muted)] shadow-[0_12px_30px_rgba(31,27,22,0.05)] backdrop-blur-xl dark:shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--marketing-accent)]" />
              <span>NCT Navigator</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--marketing-muted)]">
              2 шага
            </p>
          </div>

          <div className="mb-4">
            <span className="navigator-kicker">Core flow · onboarding</span>
          </div>

          <StepIndicator currentStep={currentStep} />

          <div className="mt-4 rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-4 shadow-[0_24px_80px_rgba(31,27,22,0.06)] ring-1 ring-[rgba(255,255,255,0.22)] backdrop-blur-xl sm:p-6 dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] dark:ring-[rgba(255,255,255,0.06)]">
            {currentStep === "location" && <StepLocation />}
            {currentStep === "profile" && <StepProfile />}
          </div>
        </section>
      </div>
    </div>
  )
}
