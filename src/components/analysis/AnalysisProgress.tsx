"use client";

import type { AnalysisStep } from "@/types/analysis";
import { STEPS as STEP_LIST } from "@/types/analysis";
import { motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  SearchCode,
  SendHorizonal,
  Sparkles,
} from "lucide-react";

const ICONS: Record<AnalysisStep, (props: { className?: string }) => React.ReactNode> = {
  submitting_request: SendHorizonal,
  analyzing_interests: Brain,
  searching_nct_codes: SearchCode,
  forming_recommendations: Sparkles,
};

const SUBTITLES: Record<AnalysisStep, string> = {
  submitting_request: "Сохраняем выбор и отправляем профиль на анализ",
  analyzing_interests:
    "DeepSeek выделяет профессии, направления и поисковые намерения",
  searching_nct_codes:
    "Локальный поиск подбирает shortlist по базе НЦТ без отправки всей базы в AI",
  forming_recommendations:
    "DeepSeek ранжирует shortlist, добавляет объяснения и сохраняет итог",
};

function PulsingDot() {
  return (
    <motion.div
      className="relative flex h-[14px] w-[14px] items-center justify-center"
      initial={{ scale: 0.8 }}
      animate={{ scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute h-full w-full rounded-full bg-primary/20"
        animate={{ scale: [1, 1.8, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative h-2 w-2 rounded-full bg-primary" />
    </motion.div>
  );
}

function ConnectingLine({ completed }: { completed: boolean }) {
  return (
    <motion.div
      className="absolute left-[13px] top-[26px] ml-0.5 h-10 w-px overflow-hidden"
      initial={false}
    >
      <motion.div
        className="h-full w-full origin-top"
        initial={{ scaleY: 0 }}
        animate={
          completed
            ? { scaleY: 1, backgroundColor: "var(--primary)" }
            : { scaleY: 1, backgroundColor: "var(--border)" }
        }
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </motion.div>
  );
}

export function AnalysisTimeline({
  currentStep,
  status,
}: {
  currentStep: AnalysisStep;
  status: "idle" | "running" | "success" | "error";
}) {
  const currentIndex = STEP_LIST.findIndex((s) => s.key === currentStep);
  const isRunning = status === "running";

  const springIn = (i: number) => ({
    type: "spring" as const,
    stiffness: 180,
    damping: 24,
    delay: i * 0.08,
  });

  return (
    <div className="w-full space-y-0">
      {STEP_LIST.map((step, index) => {
        const IconComponent = ICONS[step.key];
        const isActive = isRunning && index === currentIndex;
        const isCompleted = index < currentIndex || status === "success";

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springIn(index)}
            className="relative flex gap-5"
          >
            {index < STEP_LIST.length - 1 ? (
              <ConnectingLine completed={isCompleted} />
            ) : null}

            <div className="z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center">
              {isActive ? (
                <PulsingDot />
              ) : isCompleted ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: 0.05,
                  }}
                >
                  <CheckCircle2 className="h-[15px] w-[15px] text-primary" />
                </motion.div>
              ) : (
                <IconComponent className="h-[14px] w-[14px] text-text-muted" />
              )}
            </div>

            <div className="flex flex-1 flex-col justify-center pb-8">
              <motion.p
                layout
                className={`text-sm ${
                  isActive
                    ? "font-medium text-foreground"
                    : isCompleted
                      ? "font-medium text-primary"
                      : "text-text-muted"
                }`}
              >
                {step.label}
              </motion.p>
              {isActive ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="mt-1 text-xs text-text-muted"
                >
                  {SUBTITLES[step.key]}
                </motion.p>
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
