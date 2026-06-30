"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ClipboardList } from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import { useProfileStore } from "@/stores/profile-store";
import { CoachShell } from "@/components/coach/CoachShell";
import { CoachErrorBanner } from "@/components/coach/CoachErrorBanner";
import { CoachTabContent } from "@/components/coach/CoachTabContent";
import {
  CoachGoalSetup,
  type CoachGoalDraft,
  type CoachRecommendation,
} from "@/components/coach/CoachGoalSetup";
import {
  CoachDiagnostic,
} from "@/components/coach/CoachDiagnostic";
import type { DiagnosticResult } from "@/types/diagnostic";
import type {
  CoachGoal,
  CoachMessageType,
  CoachSubjectLevel,
  CoachDiagnosticResult,
  CoachTaskStep,
} from "@/types/coach";

export default function CoachPage() {
  const goal = useCoachStore((s) => s.goal);
  const diagnostics = useCoachStore((s) => s.diagnostics);
  const addDiagnostic = useCoachStore((s) => s.addDiagnostic);
  const setRoadmap = useCoachStore((s) => s.setRoadmap);
  const setLoading = useCoachStore((s) => s.setLoading);
  const error = useCoachStore((s) => s.error);
  const setError = useCoachStore((s) => s.setError);
  const activeTab = useCoachStore((s) => s.activeTab);
  const setDayPlan = useCoachStore((s) => s.setDayPlan);
  const dayPlan = useCoachStore((s) => s.dayPlan);
  const setTaskSteps = useCoachStore((s) => s.setTaskSteps);
  const roadmap = useCoachStore((s) => s.roadmap);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  if (!goal) return <GoalEmptyState />;
  if (showDiagnostic) {
    return (
      <CoachShell>
        <CoachDiagnostic
          nctCode={goal.nctCode}
          nctTitle={goal.nctTitle}
          onComplete={(result) => {
            addDiagnostic(buildDiagnosticResult(goal.id, result));
            setShowDiagnostic(false);
          }}
          onSkip={() => setShowDiagnostic(false)}
        />
      </CoachShell>
    );
  }

  const hasDiagnostic = diagnostics.length > 0;

  const handleGenerateRoadmap = async () => {
    if (!goal) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
          nctCode: goal.nctCode,
          nctTitle: goal.nctTitle,
          university: goal.university,
          diagnosticResult: diagnostics.length > 0 ? diagnostics[0] : null,
        }),
      });
      const payload = (await res.json()) as { status?: string; data?: { roadmap?: unknown }; error?: string };
      if (!res.ok || payload.status !== "success" || !payload.data?.roadmap)
        throw new Error(payload.error ?? "Не удалось создать Roadmap");
      setRoadmap(payload.data.roadmap as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания Roadmap");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDailyPlan = async () => {
    if (!goal || !roadmap) return;
    const activeWeek = roadmap.weeks.find((w) => w.status === "active") ?? roadmap.weeks[0];
    if (!activeWeek) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
          weekId: activeWeek.id,
          nctCode: goal.nctCode,
          nctTitle: goal.nctTitle,
          weekTitle: activeWeek.title,
          weekSubjects: activeWeek.subjects,
          weekTasks: activeWeek.tasks,
          diagnosticResult: diagnostics.length > 0 ? diagnostics[0] : null,
        }),
      });
      const payload = (await res.json()) as { status?: string; data?: { dayPlan?: unknown }; error?: string };
      if (!res.ok || payload.status !== "success" || !payload.data?.dayPlan)
        throw new Error(payload.error ?? "Не удалось создать план на день");
      setDayPlan(payload.data.dayPlan as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания плана");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDetail = async (taskId: string) => {
    if (!goal || !roadmap || !dayPlan) return;
    const task = dayPlan.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const activeWeek = roadmap.weeks.find((w) => w.status === "active") ?? roadmap.weeks[0];
    if (!activeWeek) return;
    try {
      const res = await fetch("/api/coach/task-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskType: task.type,
          taskDescription: task.description,
          nctTitle: goal.nctTitle,
          weekTitle: activeWeek.title,
        }),
      });
      const payload = (await res.json()) as { status?: string; data?: { steps?: CoachTaskStep[] }; error?: string };
      if (!res.ok || payload.status !== "success" || !payload.data?.steps)
        throw new Error(payload.error ?? "Не удалось загрузить план");
      setTaskSteps(taskId, payload.data.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки плана");
    }
  };

  return (
    <CoachShell>
      {error ? <CoachErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {!hasDiagnostic ? (
        <DiagnosticPrompt onClick={() => setShowDiagnostic(true)} />
      ) : (
        <CoachTabContent
          tab={activeTab}
          onGenerateRoadmap={handleGenerateRoadmap}
          onGenerateDailyPlan={handleGenerateDailyPlan}
          onRequestTaskDetail={handleTaskDetail}
        />
      )}
    </CoachShell>
  );
}

function DiagnosticPrompt({ onClick }: { onClick: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-[18px] border border-border bg-card-bg p-6 text-center"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          Пройдите диагностику знаний
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Без диагностики планы будут приблизительными. Coach подберёт вопросы
          под вашу специальность. Это займёт 10-15 минут.
        </p>
        <button
          type="button"
          onClick={onClick}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <BookOpen className="h-4 w-4" />
          Начать диагностику
        </button>
      </div>
    </motion.section>
  );
}

function buildDiagnosticResult(goalId: string, result: DiagnosticResult): CoachDiagnosticResult {
  const subjectCounts: Record<string, { correct: number; total: number }> = {};
  result.questions.forEach((q, i) => {
    const prev = subjectCounts[q.subject] ?? { correct: 0, total: 0 };
    prev.total++;
    if (result.answers[i]?.isCorrect) prev.correct++;
    subjectCounts[q.subject] = prev;
  });
  const subjects: CoachSubjectLevel[] = Object.entries(subjectCounts).map(([subject, counts]) => {
    const pct = counts.total > 0 ? counts.correct / counts.total : 0;
    return {
      subject,
      level: pct >= 0.7 ? "advanced" : pct >= 0.4 ? "intermediate" : "beginner",
      score: Math.round(pct * 100),
    };
  });
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    goalId,
    subjects,
    strengths: subjects.filter((s) => s.level === "advanced").map((s) => s.subject),
    weaknesses: subjects.filter((s) => s.level === "beginner").map((s) => s.subject),
    recommendations: [],
    takenAt: Date.now(),
  };
}

function GoalSetupFlow() {
  const setGoal = useCoachStore((s) => s.setGoal);
  const setError = useCoachStore((s) => s.setError);
  const rawRecommendations = useProfileStore((s) => s.recommendations);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const recommendations = useMemo<CoachRecommendation[]>(() => {
    if (!Array.isArray(rawRecommendations)) return [];
    return rawRecommendations
      .map((item): CoachRecommendation | null => {
        if (!item || typeof item !== "object") return null;
        const code = (item as { code?: unknown }).code;
        const title = (item as { title_ru?: unknown }).title_ru;
        const institution = (item as { institution?: unknown }).institution;
        const city = (item as { city?: unknown }).city;
        if (typeof code !== "string" || typeof title !== "string") return null;
        return {
          nctCode: code,
          nctTitle: title,
          institution: typeof institution === "string" ? institution : undefined,
          city: typeof city === "string" ? city : undefined,
        };
      })
      .filter((x): x is CoachRecommendation => x !== null);
  }, [rawRecommendations]);

  const handleSubmit = async (draft: CoachGoalDraft) => {
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/coach/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nctCode: draft.nctCode, nctTitle: draft.nctTitle, university: draft.university ?? "" }),
      });
      const payload = (await res.json()) as { status?: string; data?: { goal?: CoachGoal }; error?: string };
      if (!res.ok || payload.status !== "success" || !payload.data?.goal) {
        const message = payload.error ?? "Не удалось сохранить цель";
        setLocalError(message);
        setError(message);
        return;
      }
      setGoal(payload.data.goal);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Сетевая ошибка";
      setLocalError(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <CoachGoalSetup
        recommendations={recommendations}
        submitting={submitting}
        errorMessage={localError}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

function GoalEmptyState() {
  return <GoalSetupFlow />;
}

export type { CoachMessageType };
