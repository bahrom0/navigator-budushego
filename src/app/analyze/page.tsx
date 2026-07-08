"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useSpring } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { AnalysisTimeline } from "@/components/analysis/AnalysisProgress";
import { CATEGORIES } from "@/constants/categories";
import { logActivityEvent } from "@/lib/activity-logger";
import { useAnalysisStore } from "@/stores/analysis-store";
import {
  hydrateCategoryStore,
  persistCategories,
  useCategoryStore,
} from "@/stores/category-store";
import {
  hydrateOnboardingStore,
  useOnboardingStore,
} from "@/stores/onboarding-store";
import type { AnalysisStep } from "@/types/analysis";
import type { Category } from "@/types/categories";
import type { RecommendationResultSet } from "@/types/recommendations";

const STEP_ORDER: AnalysisStep[] = [
  "submitting_request",
  "analyzing_interests",
  "searching_nct_codes",
  "forming_recommendations",
];

function ProgressBar({ progress }: { progress: number }) {
  const scaleX = useSpring(progress, { stiffness: 70, damping: 22 });

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/8">
      <motion.div
        className="h-full w-full rounded-full bg-primary"
        style={{ scaleX, transformOrigin: "left" }}
      />
    </div>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const status = useAnalysisStore((state) => state.status);
  const currentStep = useAnalysisStore((state) => state.currentStep);
  const startAnalysis = useAnalysisStore((state) => state.startAnalysis);
  const setStep = useAnalysisStore((state) => state.setStep);
  const setError = useAnalysisStore((state) => state.setError);
  const setStatus = useAnalysisStore((state) => state.setStatus);
  const cacheResults = useAnalysisStore((state) => state.cacheResults);
  const reset = useAnalysisStore((state) => state.reset);
  const [progress, setProgress] = useState(0);
  const onboardingLoaded = useOnboardingStore((state) => state._loaded);
  const selectedIds = useCategoryStore((state) => state.selected);
  const analysisFiredRef = useRef(false);

  const categories: Category[] = useMemo(
    () =>
      selectedIds
        .map((id) => CATEGORIES.find((category) => category.id === id))
        .filter(Boolean) as Category[],
    [selectedIds],
  );

  const goToResults = useCallback(
    () => router.replace("/recommendations"),
    [router],
  );

  useEffect(() => {
    hydrateOnboardingStore();
  }, []);

  useEffect(() => {
    return () => {
      reset();
      analysisFiredRef.current = false;
    };
  }, [reset]);

  useEffect(() => {
    if (analysisFiredRef.current || !onboardingLoaded) return;

    const restored = hydrateCategoryStore();
    if (categories.length === 0 && !restored) {
      router.replace("/categories");
      return;
    }

    if (categories.length === 0) return;

    analysisFiredRef.current = true;
    persistCategories();
    void runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, onboardingLoaded]);

  const updateStep = useCallback(
    (step: AnalysisStep) => {
      const nextIndex = STEP_ORDER.indexOf(step);
      if (nextIndex === -1) return;
      setStep(step, nextIndex);
      setProgress(nextIndex / (STEP_ORDER.length - 1));
    },
    [setStep],
  );

  async function runAnalysis() {
    try {
      startAnalysis();
      updateStep("submitting_request");

      const onboardingData = useOnboardingStore.getState().data;
      const payload = {
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description ?? "",
        })),
        topK: 8,
        minConfidence: 0.3,
        onboarding: {
          userCity: onboardingData.userCity,
          studyCity: onboardingData.studyCity,
          userType: onboardingData.userType,
          educationLevel: onboardingData.educationLevel,
          interests: onboardingData.interests,
        },
      };

      logActivityEvent(
        "start_analysis",
        `Анализ направлений: ${categories.map((category) => category.name).join(", ")}`,
      );

      const response = await fetch("/api/recommendations/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error("Не удалось запустить поток анализа рекомендаций");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: "stage"; step: AnalysisStep }
            | { type: "result"; data: RecommendationResultSet }
            | { type: "error"; error: string };

          if (event.type === "stage") {
            updateStep(event.step);
            continue;
          }

          if (event.type === "error") {
            throw new Error(event.error || "Ошибка анализа");
          }

          cacheResults({
            ...event.data,
            categories: payload.categories,
          });
          setStatus("success");
          setProgress(1);
          goToResults();
          return;
        }
      }

      if (buffer.trim()) {
        const event = JSON.parse(buffer) as
          | { type: "result"; data: RecommendationResultSet }
          | { type: "error"; error: string };

        if (event.type === "error") {
          throw new Error(event.error || "Ошибка анализа");
        }

        cacheResults({
          ...event.data,
          categories: payload.categories,
        });
        setStatus("success");
        setProgress(1);
        goToResults();
        return;
      }

      throw new Error("Поток анализа завершился без результата");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка сети";
      setError(message);
    }
  }

  if (!onboardingLoaded) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="max-w-md rounded-[28px] border border-border bg-card-bg px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
        >
          <p className="text-sm font-medium text-error">
            Ошибка при выполнении анализа
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {useAnalysisStore.getState().error}
          </p>
          <button
            onClick={() => void runAnalysis()}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white hover:bg-primary-hover"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => router.push("/categories")}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-[14px] px-6 text-base font-medium text-text-secondary hover:text-foreground"
          >
            Вернуться назад
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%)]" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
        className="relative w-full max-w-3xl rounded-[32px] border border-border/80 bg-card-bg/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8"
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Recommendation pipeline
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Формируем ваши рекомендации НЦТ
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
                Сначала анализируем профиль и интересы, затем ищем подходящие
                коды по локальной базе и только после этого просим AI помочь с
                финальным ранжированием shortlist.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/80 bg-background/70 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {Math.round(progress * 100)}% завершено
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Этапы переключаются только по фактическому состоянию серверного
                  пайплайна
                </p>
              </div>
              <div className="rounded-full border border-border bg-card-bg px-3 py-1 text-xs font-medium text-text-secondary">
                {STEP_ORDER.indexOf(currentStep) + 1} / {STEP_ORDER.length}
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar progress={progress} />
            </div>

            <div className="mt-8">
              <AnalysisTimeline currentStep={currentStep} status={status} />
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
