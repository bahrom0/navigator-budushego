export type AnalysisStep =
  | "submitting_request"
  | "analyzing_interests"
  | "searching_nct_codes"
  | "forming_recommendations";

export type AnalysisStatus = "idle" | "running" | "success" | "error";

export const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: "submitting_request", label: "Отправка запроса" },
  { key: "analyzing_interests", label: "Анализ интересов" },
  { key: "searching_nct_codes", label: "Поиск кодов НЦТ" },
  { key: "forming_recommendations", label: "Формирование рекомендаций" },
];
