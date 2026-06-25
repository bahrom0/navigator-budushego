import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { RankedNCT, ExplanationResult } from "@/types/nct"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный ассистент для абитуриентов Таджикистана. Твоя задача — кратко и понятно объяснить, почему конкретное направление подходит пользователю. Отвечай только JSON.",
}

export interface ExplanationOptions {
  userInterests: string[]
  userKeywords: string[]
  topK?: number
  userCity?: string
  studyCity?: string
  educationLevel?: string
}

export async function generateExplanations(
  rankedResults: RankedNCT[],
  options: ExplanationOptions,
): Promise<ExplanationResult[]> {
  const { userInterests, userKeywords, topK = 5, userCity, studyCity, educationLevel } = options
  const topResults = rankedResults.slice(0, topK)

  const results: (ExplanationResult | null)[] = await Promise.all(
    topResults.map(async (match) => {
      try {
        return await getExplanationForMatch(match, userInterests, userKeywords, { userCity, studyCity, educationLevel })
      } catch (err) {
        console.error("[generate-explanations] failed for", match.code, err)
        return null
      }
    }),
  )

  return results.filter((r): r is ExplanationResult => r !== null)
}

async function getExplanationForMatch(
  match: RankedNCT,
  userInterests: string[],
  _userKeywords: string[],
  context?: { userCity?: string; studyCity?: string; educationLevel?: string },
): Promise<ExplanationResult> {
  let contextBlock = ""
  if (context) {
    const parts: string[] = []
    if (context.studyCity) parts.push(`Город обучения: ${context.studyCity}`)
    if (context.educationLevel === "after_9") parts.push("Поступает после 9 класса")
    else if (context.educationLevel === "after_11") parts.push("Поступает после 11 класса")
    if (parts.length > 0) {
      contextBlock = `\n\nКонтекст абитуриента:\n${parts.join("\n")}`
    }
  }

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Специальность: ${match.title_ru}`,
      `Код НЦТ: ${match.code}`,
      `Университет: ${match.institution}`,
      `Город: ${match.city}`,
      `Профессии: ${match.career_matches.join(", ")}`,
      `Интересы абитуриента: ${userInterests.join(", ")}`,
      ``,
      contextBlock,
      ``,
      `Сгенерируй JSON с полями:`,
      `- "whyItFits": краткое объяснение (2-3 предложения), почему эта специальность подходит абитуриенту`,
      `- "matchedInterests": массив из 2-4 интересов пользователя, которые совпадают со специальностью`,
      `- "matchedCareers": массив из 2-3 карьерных направлений, которые наиболее подходят абитуриенту`,
      ``,
      `Пример структуры:`,
      `{`,
      `  "whyItFits": "Это направление сочетает ваши интересы к программированию и системному анализу. Вы сможете работать разработчиком или аналитиком данных.",`,
      `  "matchedInterests": ["программирование", "анализ данных"],`,
      `  "matchedCareers": ["разработчик ПО", "аналитик данных"]`,
      `}`,
      ``,
      `ВАЖНО: ответ должен быть строго валидным JSON, без markdown и пояснений.`,
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 1024,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  const parsed = JSON.parse(cleaned)

  if (typeof parsed.whyItFits !== "string") {
    throw new Error("AI explanation missing required fields")
  }

  return {
    code: match.code,
    title_ru: match.title_ru,
    whyItFits: parsed.whyItFits,
    matchedInterests: Array.isArray(parsed.matchedInterests)
      ? parsed.matchedInterests.filter((v: unknown): v is string => typeof v === "string")
      : [],
    matchedCareers: Array.isArray(parsed.matchedCareers)
      ? parsed.matchedCareers.filter((v: unknown): v is string => typeof v === "string")
      : [],
  }
}
