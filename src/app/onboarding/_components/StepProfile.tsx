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
    } else if (!forced && data.educationLevel === "applicant") {
      setData({ educationLevel: "" })
    }
  }, [data.userType, data.educationLevel, setData])

  const handleFinish = () => {
    if (!data.userType) {
      setError("Пожалуйста, выберите кто вы")
      return
    }

    const forcedEducation = USER_TYPE_TO_EDUCATION[data.userType]
    if (forcedEducation) {
      if (data.educationLevel !== forcedEducation) {
        setError("Пожалуйста, подтвердите свой статус")
        return
      }
    } else if (!data.educationLevel || !["after_9", "after_11"].includes(data.educationLevel)) {
      setError("Пожалуйста, укажите уровень образования")
      return
    }

    window.location.href = "/categories"
  }

  const showEducationPicker = data.userType && data.userType !== "applicant"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--marketing-muted)]">
          Шаг 2
        </p>
        <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--marketing-foreground)] sm:text-[1.9rem]">
          Кто вы?
        </h2>
        <p className="max-w-xl text-sm leading-6 text-[var(--marketing-muted)]">
          Это поможет адаптировать рекомендации под вас
        </p>
      </div>

      <div className="space-y-2.5">
        {USER_TYPES.map((type, idx) => {
          const Icon = type.icon
          const selected = data.userType === type.id
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                setError("")
                setData({
                  userType: type.id,
                  educationLevel:
                    type.id === "applicant"
                      ? "applicant"
                      : data.educationLevel === "applicant"
                        ? ""
                        : data.educationLevel,
                })
              }}
              className={`flex w-full items-center gap-3.5 rounded-[1.4rem] border px-4 py-3 text-left transition duration-200 ${
                selected
                  ? "border-[var(--marketing-border-strong)] bg-[var(--marketing-surface-strong)] shadow-[0_18px_40px_rgba(31,27,22,0.08)]"
                  : "border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] hover:border-[var(--marketing-border-strong)] hover:bg-[var(--marketing-surface-strong)]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-[0_10px_20px_rgba(31,27,22,0.05)] transition-colors ${
                  selected
                    ? "border-transparent bg-[var(--marketing-foreground)] text-[var(--marketing-bg)]"
                    : "border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] text-[var(--marketing-muted)]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-[var(--marketing-foreground)] sm:text-base">
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
            className="space-y-2 overflow-hidden"
          >
            <div>
              <h3 className="text-sm font-semibold text-[var(--marketing-foreground)] sm:text-base">
                Уровень образования
              </h3>
              <p className="mt-0.5 text-sm text-[var(--marketing-muted)]">
                Выберите, после какого класса поступаете
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {EDUCATION_LEVELS.filter((el) => el.value !== "applicant").map((level) => {
                const selected = data.educationLevel === level.value
                return (
                  <motion.button
                    key={level.value}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setError("")
                      setData({ educationLevel: level.value })
                    }}
                    className={`h-11 rounded-[1.2rem] border px-4 text-sm font-medium transition duration-200 ${
                      selected
                        ? "border-transparent bg-[var(--marketing-foreground)] text-[var(--marketing-bg)] shadow-[0_14px_30px_rgba(31,27,22,0.12)]"
                        : "border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] text-[var(--marketing-foreground)] hover:border-[var(--marketing-border-strong)] hover:bg-[var(--marketing-surface-strong)]"
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
            className="text-sm text-error"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Button
          variant="secondary"
          onClick={prevStep}
          className="!h-11 !rounded-[1.25rem] !border !border-[var(--marketing-border)] !bg-[var(--marketing-surface-muted)] !text-[var(--marketing-foreground)] !font-semibold hover:!border-[var(--marketing-border-strong)] hover:!bg-[var(--marketing-surface-strong)]"
        >
          Назад
        </Button>
        <Button
          onClick={handleFinish}
          size="lg"
          className="!h-11 !rounded-[1.25rem] !border-transparent !bg-[var(--marketing-foreground)] !px-6 !text-base !font-semibold !text-[var(--marketing-bg)] shadow-[0_18px_40px_rgba(48,99,232,0.22)] hover:!bg-[var(--marketing-accent)]"
        >
          Начать поиск
        </Button>
      </div>
    </div>
  )
}
