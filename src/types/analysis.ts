export type AnalysisStep =
  | "analyzing_interests"
  | "matching_nct"
  | "searching_universities"
  | "forming_recommendations";

export type AnalysisStatus = "idle" | "running" | "success" | "error";

export const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: "analyzing_interests", label: "Анализируем интересы" },
  { key: "matching_nct", label: "Сопоставляем с НЦТ" },
  { key: "searching_universities", label: "Изучаем университеты" },
  { key: "forming_recommendations", label: "Формируем рекомендации" },
];
