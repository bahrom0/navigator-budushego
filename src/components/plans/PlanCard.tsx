import { motion } from "framer-motion"
import type { PlanStage } from "@/types/plan"

interface PlanCardProps {
  stage: PlanStage
  index: number
}

export function PlanCard({ stage, index }: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="rounded-[20px] border border-border bg-card-bg p-6"
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-text-secondary">
          {index + 1}
        </span>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">{stage.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{stage.description}</p>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Навыки</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stage.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Рекомендации</p>
            <ul className="mt-2 space-y-1.5">
              {stage.recommendations.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
