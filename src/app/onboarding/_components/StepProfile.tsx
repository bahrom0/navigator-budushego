"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { USER_TYPES } from "@/types/onboarding"
import type { EducationLevel } from "@/types/onboarding"
import { Button } from "@/components/Button"

const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: "after_9", label: "После 9 класса" },
  { value: "after_11", label: "После 11 класса" },
  { value: "applicant", label: "Абитуриент" },
]

const USER_TYPE_TO_EDUCATION: Record<string, EducationLevel> = {
  applicant: "applicant",
}

export function StepProfile() {
  const { data, setData, prevStep } = useOnboardingStore()
  const [error, setError] = useState("")

  useEffect(() => {
    const forced = USER_TYPE_TO_EDUCATION[data.userType]
    if (forced && data.educationLevel !== forced) {
      setData({ educationLevel: forced })
    }
  }, [data.userType, data.educationLevel, setData])

  const handleFinish = () => {
    if (!data.userType) {
      setError("Пожалуйста, выберите кто вы")
      return
    }
    if (!data.educationLevel) {
      setError("Пожалуйста, укажите уровень образования")
      return
    }
    window.location.href = "/categories"
  }

  const showEducationPicker =
    data.userType && data.userType !== "applicant"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Кто вы?</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Это поможет адаптировать рекомендации под вас
        </p>
      </div>

      <div className="space-y-2">
        {USER_TYPES.map((type, idx) => {
          const Icon = type.icon
          const selected = data.userType === type.id
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              type="button"
              onClick={() => setData({ userType: type.id })}
              className={`w-full flex items-center gap-3 h-14 px-4 rounded-xl border transition-all
                ${selected
                  ? "border-primary bg-primary-light"
                  : "border-border hover:border-border-hover bg-card-bg"
                }`}
            >
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg
                ${selected ? "bg-primary text-white" : "bg-black/[.04] text-text-secondary"}
                transition-colors`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-sm font-medium
                ${selected ? "text-primary" : "text-foreground"}`}
              >
                {type.label}
              </span>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {showEducationPicker && (
          <motion.div
            key="education"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-3 overflow-hidden"
          >
            <div>
              <h3 className="text-base font-semibold text-foreground">Уровень образования</h3>
              <p className="text-sm text-text-secondary mt-0.5">
                Выберите, после какого класса поступаете
              </p>
            </div>
            <div className="flex gap-2">
              {EDUCATION_LEVELS.filter((el) => el.value !== "applicant").map((level) => {
                const selected = data.educationLevel === level.value
                return (
                  <motion.button
                    key={level.value}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => setData({ educationLevel: level.value })}
                    className={`flex-1 h-12 rounded-xl border text-sm font-medium transition-all
                      ${selected
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border hover:border-border-hover bg-card-bg text-foreground"
                      }`}
                  >
                    {level.label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-error text-sm"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={prevStep} className="flex-1">
          Назад
        </Button>
        <Button onClick={handleFinish} className="flex-1" size="lg">
          Начать поиск
        </Button>
      </div>
    </div>
  )
}