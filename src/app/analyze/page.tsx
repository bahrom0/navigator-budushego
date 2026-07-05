"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useSpring, useTransform } from "framer-motion";
import { useAnalysisStore } from "@/stores/analysis-store";
import { hydrateOnboardingStore, useOnboardingStore } from "@/stores/onboarding-store";
import { AnalysisTimeline } from "@/components/analysis/AnalysisProgress";
import { Stethoscope } from "lucide-react";
import { hydrateCategoryStore, persistCategories, useCategoryStore } from "@/stores/category-store";
import type { AnalysisStep } from "@/types/analysis";
import { STEPS as STEP_LIST } from "@/types/analysis";
import { CATEGORIES } from "@/constants/categories";
import type { Category } from "@/types/categories";
import { logActivityEvent } from "@/lib/activity-logger";

const STEP_ORDER: AnalysisStep[] = [
  "analyzing_interests",
  "matching_nct",
  "searching_universities",
  "forming_recommendations",
];

function ProgressBar({ progress }: { progress: number }) {
  const scaleX = useSpring(progress, { stiffness: 60, damping: 20 })
  const width = useTransform(scaleX, [0, 1], ["0%", "100%"])

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-black/[.06]">
      <motion.div
        className="h-full w-full rounded-full bg-primary"
        style={{ scaleX, transformOrigin: "left" }}
      />
    </div>
  )
}

export default function AnalyzePage() {
  const router = useRouter();
  const status = useAnalysisStore((s) => s.status);
  const currentStep = useAnalysisStore((s) => s.currentStep);
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);
  const setStep = useAnalysisStore((s) => s.setStep);
  const setError = useAnalysisStore((s) => s.setError);
  const [progress, setProgress] = useState(0);
  const onboardingLoaded = useOnboardingStore((s) => s._loaded);

  const selectedIds = useCategoryStore((s) => s.selected);
  const analysisFiredRef = useRef(false);

  const categories: Category[] = selectedIds
    .map((id) => CATEGORIES.find((c: Category) => c.id === id))
    .filter(Boolean) as Category[];

  const goToResults = useCallback(() => router.push("/recommendations"), [router]);

  const reset = useAnalysisStore((s) => s.reset);

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
    if (analysisFiredRef.current) return;
    if (!onboardingLoaded) return;

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
  }, [categories.length, onboardingLoaded]);

  function advanceStep(index: number) {
    if (index < STEP_ORDER.length) {
      setStep(STEP_ORDER[index], index);
      setProgress(index / (STEP_ORDER.length - 1));
    }
  }

  async function runAnalysis() {
    try {
      startAnalysis();
      advanceStep(0);
      logActivityEvent("start_analysis", `Анализ направлений: ${categories.map((c) => c.name).join(", ")}`);

      const onboardingData = useOnboardingStore.getState().data

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description ?? "" })),
          topK: 8,
          minConfidence: 0.3,
          onboarding: {
            userCity: onboardingData.userCity,
            studyCity: onboardingData.studyCity,
            userType: onboardingData.userType,
            educationLevel: onboardingData.educationLevel,
            interests: onboardingData.interests,
          },
        }),
      })

      advanceStep(1)

      const data = await res.json()

      if (data.status === "error") {
        setError(data.error || "Ошибка анализа")
        return
      }

      advanceStep(2)

      useAnalysisStore.getState().cacheResults({
        ranked: data.data.ranked || [],
        overallConfidence: data.data.overallConfidence ?? null,
        categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description ?? "" })),
      })

      advanceStep(3)
      setProgress(1)
      goToResults()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка сети";
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
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="w-full max-w-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.05 }}
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
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6 text-sm text-text-secondary"
        >
          Подбираем специальности на основе ваших интересов и профиля
        </motion.p>

        <div className="mb-8">
          <ProgressBar progress={progress} />
        </div>

        <AnalysisTimeline currentStep={currentStep} status={status} />
      </motion.div>
    </main>
  );
}
