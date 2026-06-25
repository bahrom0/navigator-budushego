"use client"

import { useEffect } from "react"
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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <StepIndicator currentStep={currentStep} />
        
        <div className="bg-card-bg p-8 rounded-2xl shadow-sm border border-border">
          {currentStep === "location" && <StepLocation />}
          {currentStep === "profile" && <StepProfile />}
        </div>
      </div>
    </main>
  )
}