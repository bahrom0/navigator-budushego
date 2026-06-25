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
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 flex justify-between">
        {ONBOARDING_STEPS.map((step, index) => (
          <span
            key={step}
            className={`text-sm transition-colors duration-200 ${
              currentStepIndex >= index
                ? "text-foreground font-medium"
                : "text-text-muted"
            }`}
          >
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  )
}