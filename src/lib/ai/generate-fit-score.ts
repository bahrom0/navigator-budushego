import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { FitScoreResult } from "@/types/strategy"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный AI-эксперт. Оценивай соответствие пользователя выбранному направлению. " +
    "Отвечай только валидный JSON без markdown.",
}

interface GenerateFitScoreOptions {
  nctCode: string
  nctTitle: string
  userCategories: string[]
  interviewSummary?: string
  userLevel?: string
  matchedKeywords?: string[]
}

export async function generateFitScoreAI(
  options: GenerateFitScoreOptions,
): Promise<FitScoreResult | null> {
  const { nctCode, nctTitle, userCategories, interviewSummary, userLevel, matchedKeywords } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${nctTitle} (код ${nctCode})`,
      `Интересы пользователя: ${userCategories.join(", ")}`,
      matchedKeywords && matchedKeywords.length > 0
        ? `Совпавшие ключевые слова: ${matchedKeywords.join(", ")}`
        : "",
      interviewSummary ? `Результаты интервью: ${interviewSummary}` : "",
      userLevel ? `Уровень подготовки: ${userLevel}` : "",
      "",
      "Оцени Fit Score пользователя для этого направления.",
      "Ответь JSON строго по схеме:",
      "{",
      '  "overallScore": 0-100,',
      '  "factors": [{"name": "...", "score": 0-100, "maxScore": 100, "description": "..."}],',
      '  "strengths": ["сильная сторона 1", "сильная сторона 2"],',
      '  "weaknesses": ["слабая сторона 1"],',
      '  "improvementPlan": ["что улучшить за 30 дней"],',
      '  "summary": "короткое объяснение результатов"',
      "}",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].filter(Boolean).join("\n"),
  }

  try {
    const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
      temperature: 0.4,
      maxTokens: 2048,
      responseFormat: { type: "json_object" },
    })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned)

    if (typeof parsed.overallScore === "number" && Array.isArray(parsed.factors)) {
      return parsed as FitScoreResult
    }

    return null
  } catch (err) {
    console.error("[generate-fit-score] failed:", err)
    return null
  }
}
