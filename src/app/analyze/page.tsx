"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAnalysisStore } from "@/stores/analysis-store";
import { AnalysisTimeline } from "@/components/analysis/AnalysisProgress";
import { Stethoscope } from "lucide-react";
import { hydrateCategoryStore, persistCategories, useCategoryStore } from "@/stores/category-store";
import type { AnalysisStep } from "@/types/analysis";
import { analyzeCategories } from "@/lib/ai/analyze-categories";
import { CATEGORIES } from "@/constants/categories";
import type { Category } from "@/types/categories";
import { logActivityEvent } from "@/lib/activity-logger";

const STEP_ORDER: AnalysisStep[] = [
  "analyzing_interests",
  "matching_nct",
  "searching_universities",
  "forming_recommendations",
];

export default function AnalyzePage() {
  const router = useRouter();
  const status = useAnalysisStore((s) => s.status);
  const currentStep = useAnalysisStore((s) => s.currentStep);
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);
  const setStep = useAnalysisStore((s) => s.setStep);
  const setError = useAnalysisStore((s) => s.setError);

  const selectedIds = useCategoryStore((s) => s.selected);
  const analysisFiredRef = useRef(false);

  const categories: Category[] = selectedIds
    .map((id) => CATEGORIES.find((c: Category) => c.id === id))
    .filter(Boolean) as Category[];

  const goToResults = useCallback(() => router.push("/recommendations"), [router]);

  const reset = useAnalysisStore((s) => s.reset);

  useEffect(() => {
    return () => {
      reset();
      analysisFiredRef.current = false;
    };
  }, [reset]);

  useEffect(() => {
    if (analysisFiredRef.current) return;

    const restored = hydrateCategoryStore();
    const hasData = categories.length > 0;

    if (!hasData && !restored) {
      router.replace("/categories");
      return;
    }

    if (!hasData) return;

    analysisFiredRef.current = true;
    persistCategories();
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runAnalysis() {
    try {
      startAnalysis();
      logActivityEvent("start_analysis", `Анализ направлений: ${categories.map((c) => c.name).join(", ")}`);

      for (let i = 0; i < STEP_ORDER.length; i++) {
        if (i === 0) {
          await analyzeCategories(categories);
        }
        if (i < STEP_ORDER.length - 1) {
          setStep(STEP_ORDER[i + 1], i + 1);
          await delay(700 + Math.random() * 400);
        }
      }

      await delay(180);
      goToResults();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка анализа";
      setError(message);
    }
  }

  if (status === "error") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <p className="text-sm font-medium text-error">Ошибка при выполнении анализа</p>
          <p className="mt-2 text-sm text-text-secondary">
            {useAnalysisStore.getState().error}
          </p>
          <button
            onClick={runAnalysis}
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
    <main className="flex flex-1 flex-col items-center px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Анализ направлений
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-10 text-sm text-text-secondary"
        >
          Подбираем специальности на основе ваших интересов. Это займёт несколько секунд.
        </motion.p>

        <AnalysisTimeline currentStep={currentStep} status={status} />
      </motion.div>
    </main>
  );
}
