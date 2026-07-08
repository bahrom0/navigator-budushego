"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, MapPin, Search } from "lucide-react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { CITIES, STUDY_REGIONS } from "@/types/onboarding"
import { Button } from "@/components/Button"

function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  icon: Icon,
}: {
  label: string
  placeholder: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  icon: typeof MapPin
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div ref={ref} className="relative">
      <label className="mb-2 block text-sm font-medium text-[var(--marketing-muted)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-12 w-full items-center gap-3 rounded-[1.2rem] border px-4 text-left text-sm font-medium transition duration-200 backdrop-blur-xl shadow-[0_12px_32px_rgba(31,27,22,0.05)]
          ${
            open
              ? "border-[var(--marketing-border-strong)] bg-[var(--marketing-surface-strong)] text-[var(--marketing-foreground)]"
              : "border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] text-[var(--marketing-muted)] hover:border-[var(--marketing-border-strong)] hover:bg-[var(--marketing-surface-strong)]"
          }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] shadow-[0_10px_20px_rgba(31,27,22,0.05)]">
          <Icon className="h-4 w-4 text-[var(--marketing-muted)]" />
        </span>
        <span
          className={`flex-1 text-left leading-5 ${
            value ? "text-[var(--marketing-foreground)]" : "text-[var(--marketing-muted)]"
          }`}
        >
          {value || placeholder}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-[var(--marketing-muted)]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-[1.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] shadow-[0_30px_80px_rgba(31,27,22,0.14)] ring-1 ring-[rgba(255,255,255,0.18)] backdrop-blur-xl"
          >
            <div className="flex h-11 items-center gap-2 border-b border-[var(--marketing-border)] px-4">
              <Search className="h-4 w-4 text-[var(--marketing-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск..."
                className="flex-1 bg-transparent text-sm text-[var(--marketing-foreground)] outline-none placeholder:text-[var(--marketing-muted)]"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[var(--marketing-muted)]">Не найдено</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt)
                      setOpen(false)
                      setQuery("")
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      value === opt
                        ? "bg-[var(--marketing-surface-muted)] font-medium text-[var(--marketing-foreground)]"
                        : "text-[var(--marketing-muted)] hover:bg-[var(--marketing-surface-muted)] hover:text-[var(--marketing-foreground)]"
                    }`}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function StepLocation() {
  const { data, setData, nextStep } = useOnboardingStore()
  const [error, setError] = useState("")

  const handleNext = () => {
    if (!data.userCity || !data.studyCity) {
      setError("Пожалуйста, выберите оба города")
      return
    }
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--marketing-muted)]">
          Шаг 1
        </p>
        <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--marketing-foreground)] sm:text-[1.9rem]">
          Откуда вы и где хотите учиться?
        </h2>
        <p className="max-w-xl text-sm leading-6 text-[var(--marketing-muted)]">
          Это поможет показывать подходящие специальности в вашем регионе
        </p>
      </div>

      <div className="space-y-3">
        <SelectField
          label="Ваш город"
          placeholder="Выберите город"
          options={CITIES}
          value={data.userCity}
          onChange={(v) => setData({ userCity: v })}
          icon={MapPin}
        />
        <SelectField
          label="Где хотите учиться"
          placeholder="Выберите город"
          options={STUDY_REGIONS}
          value={data.studyCity}
          onChange={(v) => setData({ studyCity: v })}
          icon={Search}
        />
      </div>

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

      <Button
        onClick={handleNext}
        size="lg"
        className="w-full !h-11 !rounded-[1.25rem] !border-transparent !bg-[var(--marketing-foreground)] !px-6 !text-base !font-semibold !text-[var(--marketing-bg)] shadow-[0_18px_40px_rgba(48,99,232,0.22)] hover:!bg-[var(--marketing-accent)]"
      >
        Продолжить
      </Button>
    </div>
  )
}
