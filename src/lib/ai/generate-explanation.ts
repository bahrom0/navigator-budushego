import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { RankedNCT, ExplanationResult } from "@/types/nct"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный ассистент для абитуриентов Узбекистана. Твоя задача — кратко и понятно объяснить, почему конкретное направление подходит пользователю. Отвечай только JSON.",
}

export interface ExplanationOptions {
  userInterests: string[]
  userKeywords: string[]
  topK?: number
}

export async function generateExplanations(
  rankedResults: RankedNCT[],
  options: ExplanationOptions,
): Promise<ExplanationResult[]> {
  const { userInterests, userKeywords, topK = 5 } = options
  const topResults = rankedResults.slice(0, topK)

  const results: ExplanationResult[] = []

  for (const match of topResults) {
    const explanation = await getExplanationForMatch(
      match,
      userInterests,
      userKeywords,
    )
    results.push(explanation)
  }

  return results
}

async function getExplanationForMatch(
  match: RankedNCT,
  userInterests: string[],
  userKeywords: string[],
): Promise<ExplanationResult> {
  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Специальность: ${match.title_ru}`,
      `Код НЦТ: ${match.code}`,
      `Профессии: ${match.career_matches.join(", ")}`,
      `Интересы абитуриента: ${userInterests.join(", ")}`,
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

  try {
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

    return {
      code: match.code,
      title_ru: match.title_ru,
      whyItFits:
        typeof parsed.whyItFits === "string"
          ? parsed.whyItFits
          : `Направление ${match.title_ru} соответствует вашим интересам`,
      matchedInterests: Array.isArray(parsed.matchedInterests)
        ? parsed.matchedInterests
        : userInterests.slice(0, 3),
      matchedCareers: Array.isArray(parsed.matchedCareers)
        ? parsed.matchedCareers
        : match.career_matches.slice(0, 3),
    }
  } catch {
    return {
      code: match.code,
      title_ru: match.title_ru,
      whyItFits:
        `Направление ${match.title_ru} соответствует вашим интересам и имеет высокий рейтинг совпадений`,
      matchedInterests: userInterests.slice(0, 3),
      matchedCareers: match.career_matches.slice(0, 3),
    }
  }
}
