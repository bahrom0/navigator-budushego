"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { USER_TYPES } from "@/types/onboarding"
import type { EducationLevel, WorkingGoal } from "@/types/onboarding"
import { Button } from "@/components/Button"

const SCHOOL_EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: "after_9", label: "После 9" },
  { value: "after_11", label: "После 11" },
]

const WORKING_GOALS: { value: WorkingGoal; label: string }[] = [
  { value: "second_education", label: "Второе образование" },
  { value: "for_interest", label: "Для интереса" },
]

type ProfileMode = "schoolboy" | "working" | "none"

function getProfileMode(userType: string): ProfileMode {
  if (userType === "schoolboy") return "schoolboy"
  if (userType === "working") return "working"
  return "none"
}

export function StepProfile() {
  const { data, setData, prevStep } = useOnboardingStore()
  const [error, setError] = useState("")

  const profileMode = getProfileMode(data.userType)

  useEffect(() => {
    if (profileMode === "schoolboy") {
      if (data.workingGoal) {
        setData({ workingGoal: "" })
      }
      return
    }

    if (profileMode === "working") {
      if (data.educationLevel) {
        setData({ educationLevel: "" })
      }
      return
    }

    if (data.educationLevel || data.workingGoal) {
      setData({ educationLevel: "", workingGoal: "" })
    }
  }, [data.educationLevel, data.workingGoal, profileMode, setData])

  const handleFinish = () => {
    if (!data.userType) {
      setError("Пожалуйста, выберите кто вы")
      return
    }

    if (profileMode === "schoolboy" && !data.educationLevel) {
      setError("Пожалуйста, укажите уровень образования")
      return
    }

    if (profileMode === "working" && !data.workingGoal) {
      setError("Пожалуйста, выберите один из вариантов")
      return
    }

    window.location.href = "/categories"
  }

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
                if (type.id === "schoolboy") {
                  setData({
                    userType: type.id,
                    educationLevel: data.educationLevel === "after_9" || data.educationLevel === "after_11" ? data.educationLevel : "",
                    workingGoal: "",
                  })
                  return
                }

                if (type.id === "working") {
                  setData({
                    userType: type.id,
                    educationLevel: "",
                    workingGoal:
                      data.workingGoal === "second_education" || data.workingGoal === "for_interest"
                        ? data.workingGoal
                        : "",
                  })
                  return
                }

                setData({
                  userType: type.id,
                  educationLevel: "",
                  workingGoal: "",
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
        {profileMode === "schoolboy" && (
          <motion.div
            key="schoolboy-education"
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
              {SCHOOL_EDUCATION_LEVELS.map((level) => {
                const selected = data.educationLevel === level.value
                return (
                  <motion.button
                    key={level.value}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setError("")
                      setData({ educationLevel: level.value, workingGoal: "" })
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

        {profileMode === "working" && (
          <motion.div
            key="working-goal"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-2 overflow-hidden"
          >
            <div>
              <h3 className="text-sm font-semibold text-[var(--marketing-foreground)] sm:text-base">
                Для чего выбираете обучение
              </h3>
              <p className="mt-0.5 text-sm text-[var(--marketing-muted)]">
                Это поможет точнее подобрать рекомендации
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {WORKING_GOALS.map((goal) => {
                const selected = data.workingGoal === goal.value
                return (
                  <motion.button
                    key={goal.value}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setError("")
                      setData({ workingGoal: goal.value, educationLevel: "" })
                    }}
                    className={`h-11 rounded-[1.2rem] border px-4 text-sm font-medium transition duration-200 ${
                      selected
                        ? "border-transparent bg-[var(--marketing-foreground)] text-[var(--marketing-bg)] shadow-[0_14px_30px_rgba(31,27,22,0.12)]"
                        : "border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] text-[var(--marketing-foreground)] hover:border-[var(--marketing-border-strong)] hover:bg-[var(--marketing-surface-strong)]"
                    }`}
                  >
                    {goal.label}
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
