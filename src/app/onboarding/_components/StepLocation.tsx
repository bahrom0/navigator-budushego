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
    opt.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 h-12 px-4 rounded-xl border transition-colors
          ${open ? "border-primary" : "border-border hover:border-border-hover"}
          ${value ? "text-foreground" : "text-text-muted"}`}
      >
        <Icon className="h-4 w-4 text-text-muted shrink-0" />
        <span className="flex-1 text-left text-sm">
          {value || placeholder}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1 w-full bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 h-10 border-b border-border">
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-text-muted"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-muted">Не найдено</p>
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
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${value === opt ? "bg-primary-light text-primary font-medium" : "text-foreground hover:bg-black/[.04]"}`}
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
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Откуда вы и где хотите учиться?
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Это поможет показывать подходящие специальности в вашем регионе
        </p>
      </div>

      <div className="space-y-4">
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
          placeholder="Выберите город или страну"
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
            className="text-error text-sm"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button onClick={handleNext} className="w-full" size="lg">
        Продолжить
      </Button>
    </div>
  )
}