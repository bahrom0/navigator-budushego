"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Code2,
  Compass,
  Sparkles,
  Wand2,
} from "lucide-react";
import { CoachGoalManualForm } from "./CoachGoalManualForm";
import { CoachGoalRecommendationList } from "./CoachGoalRecommendationList";

export interface CoachRecommendation {
  nctCode: string;
  nctTitle: string;
  institution?: string;
  city?: string;
  matchScore?: number;
}

export interface CoachGoalDraft {
  nctCode: string;
  nctTitle: string;
  university?: string;
}

interface CoachGoalSetupProps {
  recommendations?: CoachRecommendation[];
  loading?: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  defaultUniversity?: string;
  onSubmit: (draft: CoachGoalDraft) => void;
}

type Mode = "recommended" | "manual";

export function CoachGoalSetup({
  recommendations = [],
  loading = false,
  submitting = false,
  errorMessage = null,
  defaultUniversity,
  onSubmit,
}: CoachGoalSetupProps) {
  const [mode, setMode] = useState<Mode>(
    recommendations.length > 0 ? "recommended" : "manual",
  );
  const [pickedIndex, setPickedIndex] = useState<number | null>(
    recommendations.length > 0 ? 0 : null,
  );
  const [nctCode, setNctCode] = useState("");
  const [nctTitle, setNctTitle] = useState("");
  const [university, setUniversity] = useState(defaultUniversity ?? "");

  const picked = pickedIndex !== null ? recommendations[pickedIndex] : null;
  const recommendedValid = !!picked && !loading;
  const manualValid =
    nctCode.trim().length > 0 && nctTitle.trim().length > 0 && !loading;
  const canSubmit = recommendedValid || (mode === "manual" && manualValid);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (mode === "recommended" && picked) {
      onSubmit({
        nctCode: picked.nctCode,
        nctTitle: picked.nctTitle,
        university: university.trim() || picked.institution || undefined,
      });
      return;
    }
    onSubmit({
      nctCode: nctCode.trim(),
      nctTitle: nctTitle.trim(),
      university: university.trim() || undefined,
    });
  };

  const modeOptions = useMemo(
    () => {
      const opts: { id: Mode; label: string; icon: typeof Compass }[] = [
        { id: "manual", label: "Ввести вручную", icon: Code2 },
      ];
      if (recommendations.length > 0) {
        opts.unshift({
          id: "recommended",
          label: "Из рекомендаций",
          icon: Sparkles,
        });
      }
      return opts;
    },
    [recommendations.length],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-md flex-col items-stretch rounded-[20px] border border-border bg-card-bg p-6"
    >
      <header className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
          <Compass className="h-7 w-7 text-primary" aria-hidden="true" />
   </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">
          Какая у тебя цель?
   </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Coach будет сопровождать тебя до поступления: построит маршрут,
          подберёт задачи и адаптирует план каждый день.
   </p>
 </header>

      {modeOptions.length > 1 ? (
        <div
          role="tablist"
          aria-label="Способ выбора цели"
          className="mt-6 grid grid-cols-2 gap-2 rounded-[14px] bg-background p-1"
        >
          {modeOptions.map((option) => {
            const Icon = option.icon;
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(option.id)}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-xs font-medium transition-colors ${
                  active
                    ? "bg-card-bg text-primary shadow-sm"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {option.label}
           </button>
            );
          })}
     </div>
      ) : null}

      {mode === "recommended" ? (
        <CoachGoalRecommendationList
          recommendations={recommendations}
          loading={loading}
          pickedIndex={pickedIndex}
          onPick={setPickedIndex}
        />
      ) : (
        <CoachGoalManualForm
          nctCode={nctCode}
          nctTitle={nctTitle}
          university={university}
          onChangeCode={setNctCode}
          onChangeTitle={setNctTitle}
          onChangeUniversity={setUniversity}
        />
      )}

      {errorMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-error/30 bg-error/5 px-3 py-2 text-xs text-error"
        >
          {errorMessage}
     </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:bg-text-muted"
      >
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        {submitting ? "Готовим Coach…" : "Начать подготовку"}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
   </button>
 </motion.section>
  );
}
