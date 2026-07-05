"use client"

import { motion } from "framer-motion"
import { ONBOARDING_STEPS, OnboardingStep } from "@/types/onboarding"

interface StepIndicatorProps {
  currentStep: OnboardingStep
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  location: "Город",
  profile: "Кто вы",
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentStepIndex = ONBOARDING_STEPS.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-[var(--marketing-muted)]">
        {ONBOARDING_STEPS.map((step, index) => (
          <span
            key={step}
            className={`transition-colors duration-200 ${
              currentStepIndex >= index
                ? "text-[var(--marketing-foreground)]"
                : "text-[var(--marketing-muted)]"
            }`}
          >
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--marketing-surface-muted)] shadow-[inset_0_1px_2px_rgba(31,27,22,0.08)]">
        <motion.div
          className="h-full rounded-full bg-[var(--marketing-accent)] shadow-[0_0_18px_rgba(31,27,22,0.12)] dark:shadow-[0_0_18px_rgba(255,255,255,0.1)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
