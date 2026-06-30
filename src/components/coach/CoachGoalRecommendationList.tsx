"use client";

import { BookOpen } from "lucide-react";
import type { CoachRecommendation } from "./CoachGoalSetup";

interface CoachGoalRecommendationListProps {
  recommendations: CoachRecommendation[];
  loading?: boolean;
  pickedIndex: number | null;
  onPick: (index: number) => void;
}

export function CoachGoalRecommendationList({
  recommendations,
  loading = false,
  pickedIndex,
  onPick,
}: CoachGoalRecommendationListProps) {
  if (loading) {
    return (
      <div className="mt-5 space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-[14px] bg-background"
          />
        ))}
   </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <p className="mt-5 rounded-[14px] bg-background px-4 py-6 text-center text-sm text-text-secondary">
        У нас пока нет рекомендаций для тебя.
        <br />
        Введите код НЦТ вручную — Coach подстроится.
   </p>
    );
  }

  return (
    <ul
      className="mt-5 space-y-2"
      role="radiogroup"
      aria-label="Рекомендации"
    >
      {recommendations.slice(0, 6).map((rec, index) => {
        const active = pickedIndex === index;
        return (
          <li key={`${rec.nctCode}-${index}`}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(index)}
              className={`flex w-full items-start gap-3 rounded-[14px] border px-3 py-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary-light/40"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <BookOpen
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  active ? "text-primary" : "text-text-muted"
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {rec.nctTitle}
             </p>
                <p className="truncate text-xs text-text-secondary">
                  {rec.nctCode}
                  {rec.institution ? ` · ${rec.institution}` : ""}
             </p>
           </div>
              {active ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Выбрано
             </span>
              ) : null}
         </button>
       </li>
        );
      })}
 </ul>
  );
}
